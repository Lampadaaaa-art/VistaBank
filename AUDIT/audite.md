# Audit Technique — Vista Gui
*Généré le 2026-05-09 · Audit complet du code source par analyse statique*

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture réelle](#2-architecture-réelle)
3. [BUGS CRITIQUES — à corriger en priorité](#3-bugs-critiques)
4. [BUGS MOYENS](#4-bugs-moyens)
5. [BUGS MINEURS & UX](#5-bugs-mineurs--ux)
6. [État réel des portails](#6-état-réel-des-portails)
7. [API Routes](#7-api-routes)
8. [Hooks & State](#8-hooks--state)
9. [Sécurité](#9-sécurité)
10. [Roadmap priorisée](#10-roadmap-priorisée)

---

## 1. Vue d'ensemble

| Métrique | Valeur |
|---|---|
| Framework | Next.js 15 — App Router |
| UI | React 19 · Tailwind CSS 4 · Framer Motion |
| Backend | **Supabase** (Auth + Postgres) — *PAS Firebase* |
| Client DB | `@supabase/ssr` (browser) · `@supabase/supabase-js` (admin) |
| State global | Zustand 5 |
| Validation | Zod 4 |
| Langage | TypeScript 5 strict |
| Rafraîchissement data | **Polling toutes les 3s** (pas de Realtime Supabase) |

> ⚠️ **L'audit précédent (2026-05-01) mentionnait Firebase partout — c'est FAUX. Le code utilise exclusivement Supabase.**

---

## 2. Architecture réelle

```
┌─────────────────────────────────────────────────────┐
│                      Client                          │
│  React 19 · Hooks Supabase (polling 3s) · Zustand   │
│  Web Speech API (TV)                                 │
└────────────────────┬────────────────────────────────┘
                     │ fetch() → Next.js API Routes
┌────────────────────▼────────────────────────────────┐
│            Next.js API Routes (serveur)              │
│  adminSupabase (service_role, bypasse RLS)           │
│  Zod · HMAC-SHA256 cookies                          │
└────────────────────┬────────────────────────────────┘
                     │ supabase-admin SDK
┌────────────────────▼────────────────────────────────┐
│                   Supabase                           │
│  Auth (email/password) · PostgreSQL · RLS            │
└─────────────────────────────────────────────────────┘
```

### Cycle de vie d'un ticket (FLUX ATTENDU)

```
Borne génère ticket  →  statut: "attente"
                              ↓
Caissier clique "Appeler le suivant"  →  statut: "en_cours" + guichetId assigné
                              ↓
TV affiche le ticket en héro + annonce vocale
                              ↓
Caissier termine  →  statut: "termine"  (ou "transfere" / "annule")
```

> ⚠️ **Un ticket en "attente" n'apparaît PAS dans le héro rouge de la TV.**
> Il apparaît uniquement dans la section "Prochains Billets" (liste basse).
> Le héro n'affiche que le ticket en `en_cours` — c'est-à-dire après que le caissier ait cliqué "Appeler le suivant".

---

## 3. BUGS CRITIQUES

### 🔴 BUG-01 — TV vide : règles RLS Supabase bloquent les lectures anonymes

**Fichiers concernés :** `app/tv/page.tsx`, `hooks/useTickets.ts`, `hooks/useGuichets.ts`

**Symptôme :** Le ticket généré depuis la borne n'apparaît ni dans "Prochains Billets" ni dans le héro de la TV, même après plusieurs secondes.

**Cause racine :**
La page `/tv` n'est pas protégée par le middleware (pas de cookie de session requis). Les hooks `useTickets` et `useGuichets` appellent Supabase avec la clé **ANON** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) sans JWT d'authentification.

Si les règles RLS de Supabase exigent `auth.role() = 'authenticated'` pour lire les tables `tickets` et `guichets`, toutes les requêtes retournent un tableau vide `[]` **sans aucun message d'erreur visible dans l'UI**. L'utilisateur voit juste "Aucun ticket en attente" et "—" dans le héro.

**Comment diagnostiquer :**
1. Ouvrir la console du navigateur sur `/tv`
2. Chercher des erreurs Supabase avec `code: "42501"` (permission denied) ou des réponses vides
3. Aller dans **Supabase Dashboard → Authentication → Policies**
4. Vérifier si les tables `tickets` et `guichets` ont des policies `SELECT` pour le rôle `anon`

**Correction — à appliquer dans Supabase Dashboard → SQL Editor :**

```sql
-- Autoriser la lecture anonyme pour l'affichage TV
CREATE POLICY "TV lecture publique tickets"
  ON tickets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "TV lecture publique guichets"
  ON guichets FOR SELECT
  TO anon
  USING (true);
```

---

### 🔴 BUG-02 — Guichet non libéré après transfert de ticket

**Fichiers concernés :** `app/caissier/page.tsx:88-112`, `app/api/tickets/[id]/route.ts:39-64`

**Symptôme :** Après un transfert, le caissier voit toujours l'ancien ticket affiché dans son interface. Le guichet reste "occupé" et le bouton "Appeler le suivant" reste bloqué car le guichet a toujours un `ticket_en_cours`.

**Cause racine :**
`handleConfirmTransfer` envoie `statut: "transfere"` mais dans l'API PATCH `/api/tickets/[id]`, seul le cas `"termine"` libère le guichet en mettant `ticket_en_cours → null`. Le cas `"transfere"` n'est pas géré.

```typescript
// app/api/tickets/[id]/route.ts — LE PROBLÈME
if (data.statut === "termine") {
  // ✅ Libère le guichet correctement
  await adminSupabase
    .from("guichets")
    .update({ ticket_en_cours: null, updated_at: now })
    .eq("id", guichetId)
}
// ❌ Aucun bloc pour "transfere" → le guichet garde l'ancien ticket indéfiniment
```

**Correction à appliquer dans `app/api/tickets/[id]/route.ts` (après le bloc "termine") :**

```typescript
if (data.statut === "transfere") {
  const guichetId = (data.guichetId ?? ticket.guichet_id) as string | undefined
  if (guichetId) {
    await adminSupabase
      .from("guichets")
      .update({ ticket_en_cours: null, updated_at: now })
      .eq("id", guichetId)
  }
}
```

---

### 🔴 BUG-03 — Impossible de vider la liste `servicesAutorises` d'un caissier

**Fichier concerné :** `app/api/users/[id]/route.ts:34-36`

**Symptôme :** Un admin désélectionne tous les services d'un caissier dans le formulaire et clique "Enregistrer". Les services restent inchangés en base de données.

**Cause racine :**

```typescript
// app/api/users/[id]/route.ts — LE PROBLÈME
if (data.servicesAutorises !== undefined && data.servicesAutorises.length > 0)
  updates.services_autorises = data.servicesAutorises
// ❌ Si servicesAutorises = [], la condition "length > 0" est false
// → la mise à jour est ignorée silencieusement
```

**Correction :**

```typescript
if (data.servicesAutorises !== undefined)
  updates.services_autorises = data.servicesAutorises
// ✅ Un tableau vide [] sera maintenant appliqué
```

---

### 🔴 BUG-04 — `terminesAujourdhui` compte toute l'historique, pas uniquement aujourd'hui

**Fichier concerné :** `hooks/useStats.ts:16`

**Symptôme :** Le compteur "Clients servis" affiché sur le dashboard caissier et superviseur affiche le total historique de TOUS les tickets terminés depuis la création de la base de données, pas ceux du jour en cours.

**Cause racine :**

```typescript
// hooks/useStats.ts — LE PROBLÈME
const terminesAujourdhui = tickets.filter((t) => t.statut === "termine").length
// ❌ Aucun filtre de date — compte tout l'historique depuis le début
```

**Correction :**

```typescript
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)
const terminesAujourdhui = tickets.filter((t) =>
  t.statut === "termine" &&
  new Date(t.createdAt) >= todayStart
).length
```

---

### 🔴 BUG-05 — `useStats` charge TOUS les tickets terminés sans limite ni date

**Fichier concerné :** `hooks/useStats.ts:8-11`

**Symptôme :** En production après quelques semaines, la page superviseur et caissier va charger des milliers de tickets terminés depuis le début, toutes les 3 secondes. Risque de freeze navigateur et saturation réseau.

**Cause racine :**

```typescript
// hooks/useStats.ts — LE PROBLÈME
const { tickets } = useTickets({
  statut: ["attente", "en_cours", "termine"],
  // ❌ "termine" sans filtre de date = toute l'histoire de la DB
})
```

**Correction :** Ajouter un paramètre `dateFrom` dans `useTickets` et filtrer à aujourd'hui, ou ne charger les tickets terminés que pour les calculs de statistiques avec une requête dédiée limitée.

---

## 4. BUGS MOYENS

### 🟡 BUG-06 — Polling 3s au lieu de Supabase Realtime

**Fichiers concernés :** Tous les hooks dans `hooks/`

**Symptôme :** Les mises à jour sur la TV, le caissier et le superviseur ont une latence pouvant aller jusqu'à 3 secondes. Sur la page superviseur, cela génère simultanément 5+ intervals de polling, soit environ 5 requêtes HTTP vers Supabase toutes les 3 secondes par onglet ouvert.

**Cause :** Tous les hooks utilisent `setInterval(fetchXxx, 3000)` au lieu des subscriptions Realtime de Supabase.

```typescript
// Actuel (tous les hooks) — inefficace
const interval = setInterval(fetchTickets, 3000)

// Idéal avec Supabase Realtime — quasi-instantané, zéro polling
const channel = supabase
  .channel('tickets-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
  .subscribe()
```

---

### 🟡 BUG-07 — Priorité des tickets complètement ignorée dans la file d'attente

**Fichier concerné :** `app/caissier/page.tsx:39-51`, `hooks/useTickets.ts:22`

**Symptôme :** Un ticket VIP ou Handicap arrivé après un ticket Standard sera servi APRÈS le Standard. La priorité choisie à la borne est stockée en base mais n'a aucun effet sur l'ordre de traitement.

**Cause :** La file est triée uniquement par `created_at` (FIFO strict). Le caissier prend toujours `attenteTickets[0]`, le plus ancien indépendamment de sa priorité.

```typescript
// hooks/useTickets.ts
let q = supabase.from("tickets").select("*").order("created_at", { ascending: true })
// ❌ Aucun tri par priorité

// app/caissier/page.tsx
const prochainTicket = attenteTickets[0] // ❌ Toujours le plus ancien
```

**Correction proposée :** Définir un ordre de priorité explicite et trier côté client :

```typescript
const PRIORITY_ORDER: Record<string, number> = {
  handicap: 1, enceinte: 2, age: 3, vip: 4, standard: 5
}
const prochainTicket = [...attenteTickets].sort(
  (a, b) => (PRIORITY_ORDER[a.priorite] ?? 5) - (PRIORITY_ORDER[b.priorite] ?? 5)
    || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
)[0]
```

---

### 🟡 BUG-08 — `handleDelete` (services et utilisateurs) sans feedback d'erreur

**Fichiers concernés :** `app/admin/services/page.tsx:119-122`, `app/admin/utilisateurs/page.tsx:151-155`

**Symptôme :** Si la suppression échoue côté serveur (contrainte FK, erreur réseau, etc.), l'UI ne montre rien. L'élément disparaît visuellement pendant 3 secondes le temps du polling, puis réapparaît. L'utilisateur croit avoir réussi.

**Cause :**

```typescript
// admin/services/page.tsx — LE PROBLÈME
const handleDelete = async (serviceId: string) => {
  if (!confirm('Supprimer ce service ?')) return;
  await fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
  // ❌ Pas de vérification de res.ok, pas de setError()
};
```

---

### 🟡 BUG-09 — `handleToggleActif` (services) sans feedback d'erreur

**Fichier concerné :** `app/admin/services/page.tsx:111-117`

```typescript
const handleToggleActif = async (serviceId: string, actif: boolean) => {
  await fetch(`/api/services/${serviceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ actif: !actif }),
  });
  // ❌ Aucun traitement si res.ok === false
};
```

---

### 🟡 BUG-10 — `admin/guichets` : liste des caissiers chargée une seule fois

**Fichier concerné :** `app/admin/guichets/page.tsx:43-51`

**Symptôme :** Si un caissier vient d'être créé depuis `admin/utilisateurs` sans recharger la page `admin/guichets`, il n'apparaît pas dans le select "Caissier assigné" du formulaire guichet.

**Cause :** La liste des caissiers est récupérée une seule fois au mount du composant, sans polling ni refresh après mutation.

```typescript
useEffect(() => { fetchCaissiers(); }, [fetchCaissiers]);
// ❌ Chargé une fois, jamais mis à jour automatiquement
```

---

### 🟡 BUG-11 — Double instance `useTickets` sur la page superviseur

**Fichier concerné :** `app/superviseur/page.tsx:23-25`

**Symptôme :** La page superviseur déclenche 2 instances de `useTickets` qui tournent en parallèle, doublant les requêtes inutilement :
- Via `useStats()` → `useTickets(["attente", "en_cours", "termine"])`
- Via `useTickets({ statut: "attente" })` directement dans le composant pour `fluxServices`

La donnée `enAttente` est déjà calculée dans `stats.enAttente`. La deuxième instance est redondante.

---

### 🟡 BUG-12 — Middleware : fallback dev sans vérification HMAC

**Fichier concerné :** `middleware.ts:13-17`

```typescript
if (!secret) {
  // No secret configured — accept plain role cookie (dev fallback)
  return (value as UserRole) || null
}
```

**Risque :** Sans `COOKIE_SECRET` configuré, n'importe qui peut définir `__role=admin` manuellement dans ses cookies navigateur et accéder à toutes les routes admin sans authentification. Le `.env.local` actuel a bien `COOKIE_SECRET` configuré — OK pour ce projet. Mais dangereux si le projet est déployé sans ce fichier.

---

## 5. BUGS MINEURS & UX

### 🟢 BUG-13 — Pas de feedback succès lors de la création/modification d'utilisateur

**Fichier concerné :** `app/admin/utilisateurs/page.tsx`

Après création ou modification, le modal se ferme silencieusement. Contrairement à `admin/services/page.tsx` qui affiche un toast vert de confirmation (`setSuccess(...)`) pendant 4 secondes, `admin/utilisateurs` ne confirme visuellement rien. L'utilisateur ne sait pas si ça a marché.

---

### 🟢 BUG-14 — `ordre` des services non garanti à la création

**Fichier concerné :** `app/admin/services/page.tsx:62`

```typescript
ordre: services.length,
// ❌ Si des services ont été supprimés ou si 2 créations simultanées,
// l'ordre peut être dupliqué ou incohérent
```

---

### 🟢 BUG-15 — TV charge tous les tickets "termine" sans limite

**Fichier concerné :** `app/tv/page.tsx:32`

```typescript
const { tickets: terminesTickets } = useTickets({ statut: "termine" })
// ❌ Sans .limit() ni filtre de date — en production, charge l'intégralité
// de l'historique alors que seuls les 4 derniers sont affichés
```

---

### 🟢 BUG-16 — `tempsMoyenService` affiché avec conversion fragile

**Fichier concerné :** `app/caissier/page.tsx:219`

```typescript
{stats.tempsMoyenService > 0 ? formatDuration(stats.tempsMoyenService * 60) : '—'}
```

`stats.tempsMoyenService` est déjà en **minutes** (divisé par 60 dans `useStats`), mais `formatDuration` attend des **secondes**. Le `* 60` reconvertit en secondes. Correct aujourd'hui, mais si `useStats` change son unité ce bug sera silencieux.

---

### 🟢 BUG-17 — Connexion "Problème de connexion ?" non implémentée

**Fichier concerné :** `app/login/page.tsx:194-196`

```typescript
<button className="text-xs text-slate-400 ...">
  Problème de connexion ?
</button>
// ❌ Bouton sans onClick — afficher de l'aide ou un contact admin
```

---

## 6. État réel des portails

| Portail | Route | État réel |
|---|---|---|
| Borne | `/borne` | ✅ Complet — génération ticket Supabase, impression, logout |
| TV Affichage | `/tv` | ⚠️ Complet UI mais dépend des règles RLS anon **(BUG-01)** |
| Caissier | `/caissier` | ✅ Fonctionnel — BUG-02 (transfert bloque guichet) à corriger |
| Superviseur | `/superviseur` | ✅ Dashboard complet et fonctionnel |
| Admin Vue d'ensemble | `/admin` | ✅ Dashboard complet |
| Admin Utilisateurs | `/admin/utilisateurs` | ✅ CRUD complet et opérationnel |
| Admin Services | `/admin/services` | ✅ CRUD complet et opérationnel |
| Admin Guichets | `/admin/guichets` | ✅ CRUD complet et opérationnel |
| Admin Paramètres | `/admin/parametres` | ✅ Formulaire complet et opérationnel |
| Login | `/login` | ✅ Supabase Auth + session cookie HMAC |

### Sous-pages non implémentées (stubs)

| Page | État |
|---|---|
| `/caissier/file-attente` | ❌ Stub vide |
| `/caissier/historique` | ❌ Stub vide |
| `/caissier/assistance` | ❌ Stub vide |
| `/superviseur/alertes` | ❌ Stub vide |
| `/superviseur/files-attente` | ❌ Stub vide |
| `/superviseur/guichets` | ❌ Stub vide |
| `/superviseur/rapports` | ✅ Implémenté |

---

## 7. API Routes

### Tickets

| Route | Méthode | Rôles requis | Notes |
|---|---|---|---|
| `/api/public/tickets` | POST | — (public) | Borne — appelle la RPC `next_ticket_numero` |
| `/api/tickets` | GET | admin, superviseur, caissier | Filtres: `statut`, `serviceCode` |
| `/api/tickets` | POST | admin, caissier | Identique à la route publique |
| `/api/tickets/[id]` | GET | auth | Ticket unique |
| `/api/tickets/[id]` | PATCH | auth | Calculs temps auto — **BUG-02 : "transfere" ne libère pas le guichet** |
| `/api/tickets/[id]` | DELETE | admin | OK |

### Guichets

| Route | Méthode | Rôles requis | Notes |
|---|---|---|---|
| `/api/guichets` | GET | auth | OK |
| `/api/guichets` | POST | admin | Vérif unicité numéro + caissierUid |
| `/api/guichets/[id]` | PATCH | auth | OK |
| `/api/guichets/[id]` | DELETE | admin | OK |

### Services

| Route | Méthode | Rôles requis | Notes |
|---|---|---|---|
| `/api/public/services` | GET | — (public) | Retourne uniquement les services actifs |
| `/api/services` | GET | auth | Tous les services |
| `/api/services` | POST | admin | Vérif unicité code |
| `/api/services/[id]` | PATCH | admin | OK |
| `/api/services/[id]` | DELETE | admin | OK |

### Utilisateurs

| Route | Méthode | Rôles requis | Notes |
|---|---|---|---|
| `/api/users` | GET | admin | OK |
| `/api/users` | POST | admin | Crée Supabase Auth + profil DB — rollback Auth si DB échoue |
| `/api/users/[id]` | GET | admin | OK |
| `/api/users/[id]` | PATCH | admin | **BUG-03 : servicesAutorises=[] ignoré** · Cascade statut→guichet |
| `/api/users/[id]` | DELETE | admin | Supprime Auth + profil DB |

### Alertes

| Route | Méthode | Rôles requis | Notes |
|---|---|---|---|
| `/api/alertes` | GET | admin, superviseur | Filtre optionnel `?resolue=true/false` |
| `/api/alertes` | POST | auth | OK |
| `/api/alertes/[id]` | PATCH | admin, superviseur | Résolution d'alerte |

### Auth & Divers

| Route | Méthode | Notes |
|---|---|---|
| `/api/auth/login` | POST | `createSession()` — vérifie Supabase Auth + crée cookies HMAC |
| `/api/auth/logout` | POST | `clearSession()` — supprime les cookies |
| `/api/parametres` | GET / PATCH | auth / admin |
| `/api/cron/alertes` | POST | Protégé par `CRON_SECRET` en header Authorization |

---

## 8. Hooks & State

| Hook | Méthode de rafraîchissement | Problème identifié |
|---|---|---|
| `useTickets` | `setInterval(3000)` | BUG-05: charge tous les "termine" sans filtre date |
| `useGuichets` | `setInterval(3000)` | OK |
| `useServices` | `setInterval(3000)` | OK |
| `useAlertes` | `setInterval(3000)` | Peut être bloqué par RLS si non authentifié |
| `useUsersPresence` | `setInterval(3000)` | OK |
| `useAuth` | `onAuthStateChange` + polling statut 10s | OK |
| `useStats` | Dérivé de `useTickets` | BUG-04 + BUG-05 |
| `useUsers` | Une seule fois au mount + `refresh()` manuel | Pas de temps réel automatique |

### Pourquoi les hooks client lisent Supabase directement

Les hooks (`useTickets`, `useGuichets`, etc.) accèdent à Supabase via la clé **ANON** avec `createBrowserClient`. Pour les utilisateurs authentifiés via `supabase.auth.signInWithPassword()`, le client gère automatiquement le JWT dans les requêtes, ce qui permet au RLS de fonctionner avec `auth.role() = 'authenticated'`.

**Exception critique :** La page `/tv` ne passe jamais par le login Supabase. Les requêtes arrivent sans JWT → soumises aux politiques RLS pour le rôle `anon`. Sans policy `SELECT` pour `anon` sur `tickets` et `guichets` → tableaux vides.

---

## 9. Sécurité

### Points forts

- Cookies `__session` (access token) + `__role` signés HMAC-SHA256 avec `COOKIE_SECRET`
- `requireAuth()` vérifié côté serveur à chaque appel API
- Wrapper `withAuth(roles, handler)` protège toutes les routes sensibles
- Validation Zod sur tous les corps de requête
- `adminSupabase` (service_role key) utilisé uniquement côté serveur — bypasse RLS légitimement
- Rollback Supabase Auth si l'insert profil DB échoue (création utilisateur atomique)
- Cookie `httpOnly`, `secure` en production, `sameSite: lax`

### Points faibles

| Problème | Sévérité | Détail |
|---|---|---|
| Politiques RLS non vérifiées pour anon | 🔴 Haute | Cause principale de la TV vide (BUG-01) |
| Pas de rate limiting sur routes publiques | 🟡 Moyenne | `/api/public/tickets` peut être spammé depuis la borne |
| Fallback dev sans HMAC si COOKIE_SECRET absent | 🟡 Moyenne | BUG-12 — risque si déployé sans .env |
| `.env.local` commité dans git ? | 🔴 À vérifier | Contient des clés Supabase réelles — ne JAMAIS commiter |

---

## 10. Roadmap priorisée

### Phase 0 — Correctifs bloquants (à faire maintenant)

- [ ] **BUG-01** : Créer les policies RLS Supabase `SELECT` pour `anon` sur `tickets` et `guichets` (TV vide)
- [ ] **BUG-02** : Libérer le guichet quand un ticket est transféré — ajouter le bloc `"transfere"` dans `api/tickets/[id]` PATCH
- [ ] **BUG-03** : Permettre `servicesAutorises: []` — retirer la condition `&& length > 0`
- [ ] **BUG-04** : Filtrer `terminesAujourdhui` par date dans `useStats`

### Phase 1 — Qualité & données

- [ ] **BUG-05** : Limiter le chargement des tickets "termine" à la journée en cours
- [ ] **BUG-07** : Implémenter le tri par priorité dans la file d'attente caissier
- [ ] **BUG-08/09** : Ajouter gestion d'erreur sur `handleDelete` et `handleToggleActif`
- [ ] **BUG-10** : Rafraîchir la liste des caissiers dans `admin/guichets` après mutation
- [ ] **BUG-13** : Ajouter un toast de succès après création/modification d'utilisateur

### Phase 2 — Performance

- [ ] **BUG-06** : Migrer les hooks vers Supabase Realtime (subscriptions `postgres_changes`)
- [ ] **BUG-11** : Dédupliquer l'instance `useTickets` redondante dans le superviseur

### Phase 3 — Fonctionnalités manquantes

- [ ] `/caissier/file-attente` — Vue complète de la file avec scroll
- [ ] `/caissier/historique` — Historique paginé des tickets du jour
- [ ] `/caissier/assistance` — Envoi d'alerte superviseur en un clic
- [ ] `/superviseur/alertes` — Liste complète + résolution d'alertes
- [ ] `/superviseur/files-attente` — Vue multi-guichets en temps réel
- [ ] `/superviseur/guichets` — Contrôle statut guichets (ouvrir/fermer/pause)
- [ ] Rate limiting sur `/api/public/tickets` (anti-spam borne)
- [ ] Configuration cron Vercel pour `/api/cron/alertes`
- [ ] Tests Playwright E2E sur le flux critique : génération ticket → appel caissier → TV

---

## Checklist de diagnostic rapide

**Si les tickets ne s'affichent pas sur la TV :**

1. Ouvrir la **console navigateur** sur `/tv` → chercher des erreurs Supabase `42501` ou des tableaux `[]`
2. Aller dans **Supabase Dashboard → Table Editor → `tickets`** → tester une lecture en tant qu'anon
3. Aller dans **Supabase Dashboard → Authentication → Policies** → vérifier si `tickets` et `guichets` ont des policies `SELECT` pour `anon`
4. Si non : appliquer le SQL du BUG-01
5. Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local` correspondent au projet Supabase actif
6. Vérifier que la **fonction RPC `next_ticket_numero`** existe dans Supabase (SQL Editor) :
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'next_ticket_numero';
   ```
   Si vide → la génération de numéro échoue silencieusement et aucun ticket n'est inséré.

---

*Audit réalisé par analyse statique complète du code source — Vista Gui · 2026-05-09*
