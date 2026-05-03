# Audit Technique — Vista Gui
*Généré le 2026-05-01 · Audit complet du code source*

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Portails & Pages](#3-portails--pages)
4. [API Routes](#4-api-routes)
5. [Hooks & State Management](#5-hooks--state-management)
6. [Sécurité](#6-sécurité)
7. [Base de données & Persistence](#7-base-de-données--persistence)
8. [Points forts](#8-points-forts)
9. [Points faibles & Dettes techniques](#9-points-faibles--dettes-techniques)
10. [Roadmap recommandée](#10-roadmap-recommandée)
11. [Checklist de suivi](#11-checklist-de-suivi)

---

## 1. Vue d'ensemble

**Vista Gui** est un système de gestion de file d'attente bancaire multi-rôles. L'application est opérationnelle avec un backend Firebase réel (Auth + Firestore) et des pages principales fonctionnelles.

| Métrique | Valeur |
|---|---|
| Framework | Next.js 15.4.9 — App Router |
| UI | React 19.2 · Tailwind CSS 4.1 · Framer Motion 12 |
| Backend | Firebase Admin SDK 13 · Firestore · Firebase Auth |
| State global | Zustand 5 |
| Validation | Zod 4 |
| Langage | TypeScript 5.9 strict |
| Complétion globale estimée | ~60 % |

---

## 2. Architecture

### Stack technique

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
│   React 19 · Tailwind 4 · Framer Motion · Zustand          │
│   Hooks Firestore (temps réel) · Web Speech API            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / Firestore SDK
┌────────────────────────▼────────────────────────────────────┐
│                   Next.js API Routes                        │
│   Firebase Admin SDK · Zod · HMAC-SHA256 cookies           │
└────────────────────────┬────────────────────────────────────┘
                         │ Firebase Admin
┌────────────────────────▼────────────────────────────────────┐
│                      Firebase                               │
│   Auth (email/password) · Firestore · Realtime Database    │
└─────────────────────────────────────────────────────────────┘
```

### Portails et rôles

| Portail | Route | Rôle Firebase | État |
|---|---|---|---|
| Borne (Kiosk) | `/borne` | `borne` | ✅ Complet |
| Affichage TV | `/tv` | (public) | ✅ Complet |
| Caissier | `/caissier` | `caissier` | ✅ Principal complet, sous-pages stub |
| Superviseur | `/superviseur` | `superviseur` | ✅ Dashboard complet, sous-pages partielles |
| Admin | `/admin` | `admin` | ✅ Dashboard complet, sous-pages stub |

### Flux de données

```
Firestore (temps réel)
    ↓  (useTickets / useGuichets / useAlertes)
Composants React
    ↓  (actions utilisateur)
API Routes Next.js  →  Firebase Admin SDK  →  Firestore
```

### Cycle de vie d'un ticket

```
attente → en_cours → termine
              ↘ transfere / annule
```

Lors de la transition `en_cours` : le guichet est mis à jour, `appelleAt` est enregistré.
Lors de `termine` : `tempsService` et `tempsAttente` sont calculés automatiquement côté serveur.

---

## 3. Portails & Pages

### 3.1 Borne client (`/borne`)

**Fichier :** `app/borne/page.tsx`

**Fonctionnalités implémentées :**
- ✅ Grille de sélection des services (chargée dynamiquement depuis `/api/public/services`)
- ✅ Sélection de priorité : Standard, VIP, Femme Enceinte, Personne Âgée, Handicap/Urgence
- ✅ Génération de ticket via POST `/api/public/tickets`
- ✅ Affichage du ticket avec code-barres décoratif
- ✅ Bouton d'impression (`window.print()` + CSS `@media print`)
- ✅ Horloge temps réel
- ✅ Déconnexion avec mise à jour de présence Firestore

**Améliorations appliquées :**
- CSS `@page { size: 80mm auto; margin: 0; }` pour impression thermique propre

---

### 3.2 Affichage TV (`/tv`)

**Fichier :** `app/tv/page.tsx`

**Fonctionnalités implémentées :**
- ✅ Affichage du ticket appelé en grand (hero rouge)
- ✅ Annonce vocale en français (Web Speech API) — double annonce avec 1,2 s de pause
- ✅ Sélection automatique de voix Google fr-FR pour une meilleure qualité
- ✅ 4 prochains tickets en attente
- ✅ Historique des 4 derniers appels avec heure relative
- ✅ Fil d'actualité défilant en pied de page
- ✅ Bouton plein écran discret (coin inférieur droit)
- ✅ Horloge et date en temps réel

---

### 3.3 Caissier (`/caissier`)

**Fichier principal :** `app/caissier/page.tsx`

**Fonctionnalités implémentées :**
- ✅ Affichage du ticket en cours (grand)
- ✅ Bouton "Appeler le suivant" — PATCH `/api/tickets/[id]` statut `en_cours`
- ✅ Actions : Pause guichet, Transfert (modal service), Terminer
- ✅ Aperçu des 3 prochains tickets
- ✅ Stats journalières (clients servis, temps moyen de service)
- ✅ Modal de transfert avec sélection de service

**Sous-pages (stubs — non implémentées) :**
- ❌ `/caissier/file-attente` — Liste complète de la file
- ❌ `/caissier/historique` — Historique des tickets traités
- ❌ `/caissier/assistance` — Demande d'assistance superviseur

---

### 3.4 Superviseur (`/superviseur`)

**Fichier principal :** `app/superviseur/page.tsx`

**Fonctionnalités implémentées :**
- ✅ KPIs temps réel : en attente, temps moyen d'attente, guichets actifs, alertes actives
- ✅ Tableau "Flux par Service" (file, attente max, taux complétion)
- ✅ Sidebar alertes actives (3 dernières avec lien vers toutes)
- ✅ Indicateur de statut temps réel

**Sous-pages :**
- ✅ `/superviseur/rapports` — KPIs, graphiques, tableau performances guichets + bouton téléchargement PDF
- ❌ `/superviseur/alertes` — Gestion complète des alertes (stub)
- ❌ `/superviseur/files-attente` — Vue détaillée des files (stub)
- ❌ `/superviseur/guichets` — Statut guichets (stub)

---

### 3.5 Admin (`/admin`)

**Fichier principal :** `app/admin/page.tsx`

**Fonctionnalités implémentées :**
- ✅ Dashboard avec KPIs (clients, attente moyenne, taux service, guichets ouverts)
- ✅ Tableau statut guichets
- ✅ Résumé d'activité

**Sous-pages (stubs — non implémentées) :**
- ❌ `/admin/utilisateurs` — CRUD utilisateurs (API prête, UI manquante)
- ❌ `/admin/services` — CRUD services (API prête, UI manquante)
- ❌ `/admin/guichets` — CRUD guichets (API prête, UI manquante)
- ❌ `/admin/parametres` — Paramètres agence (API prête, UI manquante)

---

### 3.6 Authentification (`/login`)

- ✅ Formulaire email/password
- ✅ Firebase sign-in + session cookie HMAC
- ✅ Redirection par rôle
- ✅ Gestion d'erreurs Firebase (compte désactivé, mauvais mdp, etc.)

---

## 4. API Routes

### Auth

| Route | Méthode | Rôle requis | Description |
|---|---|---|---|
| `/api/auth/login` | POST | — | Sign-in Firebase + création session cookie |
| `/api/auth/logout` | POST | — | Suppression cookies + marquage hors-ligne |

### Tickets

| Route | Méthode | Rôles | Description |
|---|---|---|---|
| `/api/tickets` | GET | admin, superviseur, caissier | Liste tickets avec filtres (statut, service, guichet) |
| `/api/tickets` | POST | admin, caissier | Créer ticket (incrémente compteur journalier) |
| `/api/tickets/[id]` | GET | auth | Ticket unique |
| `/api/tickets/[id]` | PATCH | auth | Changer statut + calculs temps auto |
| `/api/tickets/[id]` | DELETE | admin | Supprimer ticket |

### Guichets

| Route | Méthode | Rôles | Description |
|---|---|---|---|
| `/api/guichets` | GET | auth | Liste tous les guichets |
| `/api/guichets` | POST | admin | Créer guichet (validation unicité) |
| `/api/guichets/[id]` | PATCH | auth | Mettre à jour guichet |
| `/api/guichets/[id]` | DELETE | admin | Supprimer guichet |

### Services

| Route | Méthode | Rôles | Description |
|---|---|---|---|
| `/api/services` | GET | auth | Liste services |
| `/api/services` | POST | admin | Créer service (code unique) |
| `/api/services/[id]` | PATCH | admin | Mettre à jour service |
| `/api/services/[id]` | DELETE | admin | Supprimer service |

### Utilisateurs

| Route | Méthode | Rôles | Description |
|---|---|---|---|
| `/api/users` | GET | admin | Liste utilisateurs |
| `/api/users` | POST | admin | Créer utilisateur (Firebase Auth + Firestore) |
| `/api/users/[id]` | GET | admin | Utilisateur unique |
| `/api/users/[id]` | PATCH | admin | Mise à jour (cascade : statut → désactive auth Firebase) |
| `/api/users/[id]` | DELETE | admin | Supprime utilisateur + compte Firebase Auth |

### Alertes

| Route | Méthode | Rôles | Description |
|---|---|---|---|
| `/api/alertes` | GET | admin, superviseur | Liste alertes (filtre `resolue`) |
| `/api/alertes` | POST | auth | Créer alerte |
| `/api/alertes/[id]` | PATCH | admin, superviseur | Résoudre alerte |

### Paramètres & Public

| Route | Méthode | Rôles | Description |
|---|---|---|---|
| `/api/parametres` | GET | auth | Paramètres agence |
| `/api/parametres` | PATCH | admin | Mettre à jour paramètres |
| `/api/public/services` | GET | — | Services actifs (borne, sans auth) |
| `/api/public/tickets` | POST | — | Créer ticket depuis borne (sans auth) |
| `/api/cron/alertes` | POST | CRON_SECRET | Job automatisé : génère alertes si seuils dépassés |

---

## 5. Hooks & State Management

### Hooks Firestore (temps réel)

| Hook | Fichier | Écoute | Description |
|---|---|---|---|
| `useAuth` | `hooks/useAuth.ts` | Firebase Auth | Session utilisateur + présence Firestore + auto-logout si statut=inactif |
| `useTickets` | `hooks/useTickets.ts` | `tickets` collection | Tickets avec filtres (statut, serviceCode, guichetId) |
| `useGuichets` | `hooks/useGuichets.ts` | `guichets` collection | Tous les guichets triés par numéro |
| `useServices` | `hooks/useServices.ts` | `services` collection | Services (option actifs uniquement) |
| `useAlertes` | `hooks/useAlertes.ts` | `alertes` collection | Alertes filtrables par `resolue` |
| `useStats` | `hooks/useStats.ts` | Dérivé de tickets + guichets | KPIs calculés côté client |
| `useUsersPresence` | `hooks/useUsersPresence.ts` | `presence` collection | Présence temps réel des utilisateurs |

### State global

| Store | Fichier | Contenu |
|---|---|---|
| `authStore` | `store/authStore.ts` | `user: SessionUser \| null` · `loading: boolean` |

### Utilitaires

| Fichier | Rôle |
|---|---|
| `lib/utils.ts` | `cn()` — fusion classes Tailwind (clsx + tailwind-merge) |
| `lib/api-helpers.ts` | `ok()`, `err()`, `withAuth()`, `handleZodError()` |
| `lib/validations.ts` | Schémas Zod pour toutes les entités |
| `lib/auth.ts` | `createSession()`, `getSession()`, `clearSession()`, `requireAuth()` |
| `lib/firebase.ts` | Client SDK : `auth`, `db` (Firestore), `rtdb` (Realtime DB) |
| `lib/firebase-admin.ts` | Admin SDK (server-side) |

---

## 6. Sécurité

### Authentification

- Firebase Auth (email/password) côté client
- Session cookie `__session` signé HMAC-SHA256 avec `COOKIE_SECRET`
- Cookie `__role` pour la redirection côté middleware
- Les cookies sont `httpOnly`, `sameSite: strict`, `secure` (production)

### Autorisation

**Middleware Next.js (`middleware.ts`) :**
- Vérifie la signature HMAC du cookie `__role` sur chaque requête
- Redirige vers `/login` si non authentifié
- Redirige vers le dashboard du rôle si accès à un portail interdit

**API Routes :**
- Wrapper `withAuth(roles, handler)` → `requireAuth()` → `getSession()` → vérifie le rôle
- Toutes les routes protégées sont validées côté serveur (pas de confiance sur le client)

### Validation des entrées

- Tous les corps de requête sont validés avec Zod avant traitement
- `handleZodError()` retourne des messages d'erreur clairs sans exposer les internals

### Firestore Security Rules

- Fichier `firestore.rules` présent (contenu à vérifier/durcir avant prod)

### Variables d'environnement

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | SDK client (exposé au navigateur — normal) |
| `FIREBASE_ADMIN_*` | SDK admin (serveur uniquement) |
| `COOKIE_SECRET` | Signature HMAC cookies |
| `CRON_SECRET` | Authentification du job cron |
| `GEMINI_API_KEY` | (optionnel) IA générative |

---

## 7. Base de données & Persistence

### Collections Firestore

| Collection | Documents | Description |
|---|---|---|
| `users` | `{uid}` | Profils utilisateurs (rôle, nom, guichetId, statut) |
| `tickets` | `{auto-id}` | Tickets avec statut, priorité, timestamps, temps calculés |
| `guichets` | `{auto-id}` | Guichets avec statut, caissier assigné, ticket en cours |
| `services` | `{auto-id}` | Services bancaires (code, nom, temps estimé, actif) |
| `alertes` | `{auto-id}` | Alertes système avec type, sévérité, résolution |
| `parametres` | `agence` | Configuration agence (seuils, horaires, voix) |
| `presence` | `{uid}` | Présence en ligne temps réel |
| `compteurs` | `{service}_{date}` | Compteurs journaliers pour numérotation tickets |

### Indexes composites (`firestore.indexes.json`)

Indexes définis pour optimiser les requêtes fréquentes (tickets par statut+date, alertes par résolution+date, etc.).

---

## 8. Points forts

- **Architecture propre** : séparation claire client/serveur, API routes Next.js bien organisées
- **Temps réel** : Firestore listeners dans tous les hooks → mise à jour instantanée sans polling
- **Sécurité solide** : HMAC cookies + Firebase Admin + validation Zod à chaque couche
- **Typage fort** : TypeScript strict, types centralisés dans `lib/types.ts`
- **Système d'alertes automatisé** : job cron avec 3 règles métier configurables
- **Multi-rôles fonctionnel** : 5 rôles distincts avec isolation de routes
- **Voix TV** : annonce double en français avec sélection automatique de la meilleure voix disponible
- **Impression thermique** : CSS `@page` adapté aux imprimantes 80 mm

---

## 9. Points faibles & Dettes techniques

### Fonctionnel

| Problème | Impact | Priorité |
|---|---|---|
| Pages admin UI manquantes (utilisateurs, services, guichets, paramètres) | Admin ne peut pas gérer l'app via UI | 🔴 Haute |
| Sous-pages caissier stub (file-attente, historique, assistance) | Fonctionnalités caissier incomplètes | 🟡 Moyenne |
| Sous-pages superviseur stub (alertes, files-attente, guichets) | Supervision limitée | 🟡 Moyenne |
| Pas de gestion des erreurs réseau dans les hooks | Silence en cas de problème Firebase | 🟡 Moyenne |
| Cron non configuré (Vercel / externe) | Alertes automatiques ne se déclenchent pas | 🟡 Moyenne |

### Technique

| Problème | Impact | Priorité |
|---|---|---|
| `firestore.rules` à auditer/durcir | Risque sécurité en production | 🔴 Haute |
| `@google/genai` installé mais non utilisé | Bundle inutilement alourdi | 🟢 Faible |
| Pas de tests (unitaires, intégration, E2E) | Régressions difficiles à détecter | 🟡 Moyenne |
| `seed.ts` non documenté | Difficile à utiliser pour nouveaux devs | 🟢 Faible |
| Pas de rate limiting sur `/api/public/tickets` | Abus possible de la borne | 🟡 Moyenne |

---

## 10. Roadmap recommandée

### Phase 1 — Pages admin UI (priorité haute)

- [ ] `/admin/utilisateurs` — CRUD complet (formulaire création/édition, tableau, activation/désactivation)
- [ ] `/admin/services` — Formulaire service + toggle actif/inactif + réordonnancement
- [ ] `/admin/guichets` — Assignation caissier, changement statut
- [ ] `/admin/parametres` — Formulaire paramètres agence (seuils, horaires, nom)

### Phase 2 — Sous-pages caissier & superviseur

- [ ] `/caissier/historique` — Historique paginé des tickets du jour
- [ ] `/caissier/file-attente` — Vue complète de la file
- [ ] `/caissier/assistance` — Envoi d'alerte au superviseur
- [ ] `/superviseur/alertes` — Liste complète + résolution d'alertes
- [ ] `/superviseur/files-attente` — Vue multi-guichets en temps réel
- [ ] `/superviseur/guichets` — Statut + actions (ouvrir/fermer/pause)

### Phase 3 — Infrastructure

- [ ] Configurer le cron Vercel pour `/api/cron/alertes`
- [ ] Durcir `firestore.rules` (règles par rôle)
- [ ] Ajouter rate limiting sur les routes publiques
- [ ] Tests Playwright E2E sur les flux critiques (ticket → appel → fin)

### Phase 4 — Améliorations UX

- [ ] Notifications push (Firebase Cloud Messaging) pour alertes caissier
- [ ] Mode sombre pour l'affichage TV
- [ ] Export Excel en plus du PDF pour les rapports
- [ ] PWA offline pour la borne

---

## 11. Checklist de suivi

### Fonctionnalités implémentées

- [x] Authentification multi-rôles (Firebase Auth + session HMAC)
- [x] Borne : sélection service + priorité + génération ticket
- [x] Borne : impression ticket thermique (CSS @page 80mm)
- [x] TV : affichage ticket appelé en temps réel
- [x] TV : annonce vocale double en français (Web Speech API)
- [x] TV : bouton plein écran discret
- [x] Caissier : appel ticket suivant + actions (terminer, transférer, pause)
- [x] Superviseur : dashboard KPIs temps réel
- [x] Superviseur : rapports avec téléchargement PDF
- [x] Admin : dashboard KPIs + tableau guichets
- [x] Système d'alertes (3 règles cron)
- [x] Middleware de protection des routes par rôle
- [x] API REST complète (tickets, guichets, services, users, alertes, paramètres)

### À faire

- [ ] UI admin : utilisateurs
- [ ] UI admin : services
- [ ] UI admin : guichets
- [ ] UI admin : paramètres
- [ ] Sous-pages caissier (historique, file-attente, assistance)
- [ ] Sous-pages superviseur (alertes, files-attente, guichets)
- [ ] Configuration cron production
- [ ] Durcissement firestore.rules
- [ ] Rate limiting routes publiques
- [ ] Tests automatisés

---

*Audit réalisé par analyse statique du code source — Vista Gui v1.0-beta*
