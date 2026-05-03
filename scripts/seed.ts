/**
 * Script de seed Supabase — peuple les données initiales
 *
 * Usage :
 *   npx tsx scripts/seed.ts
 *
 * Prérequis : remplir .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SERVICES = [
  { code: "A", nom: "Dépôt",             icone: "ArrowDownCircle", temps_estime: 5,  actif: true, ordre: 0 },
  { code: "B", nom: "Retrait",           icone: "ArrowUpCircle",   temps_estime: 5,  actif: true, ordre: 1 },
  { code: "C", nom: "Ouverture de compte", icone: "FilePlus",      temps_estime: 20, actif: true, ordre: 2 },
  { code: "D", nom: "Crédit & Prêts",    icone: "Banknote",        temps_estime: 30, actif: true, ordre: 3 },
  { code: "E", nom: "Change de devises", icone: "ArrowLeftRight",  temps_estime: 10, actif: true, ordre: 4 },
  { code: "F", nom: "Virement bancaire", icone: "Send",            temps_estime: 10, actif: true, ordre: 5 },
  { code: "G", nom: "Renseignements",    icone: "HelpCircle",      temps_estime: 8,  actif: true, ordre: 6 },
]

const now = new Date().toISOString()

const GUICHETS = Array.from({ length: 12 }, (_, i) => ({
  numero:          i + 1,
  nom:             `Guichet ${i + 1}`,
  service_code:    SERVICES[i % SERVICES.length].code,
  statut:          i < 6 ? "ferme" : "hors_ligne",
  ticket_en_cours: null,
  updated_at:      now,
}))

const PARAMETRES = {
  id:                       "agence",
  nom:                      "Agence Principale Vista Bank",
  adresse:                  "123 Avenue de la République, Dakar",
  telephone:                "+221 33 XXX XX XX",
  voix_active:              true,
  seuil_temps_attente:      20,
  seuil_inactivite_guichet: 15,
  horaires: {
    lundi:    { ouverture: "08:00", fermeture: "16:30", ouvert: true },
    mardi:    { ouverture: "08:00", fermeture: "16:30", ouvert: true },
    mercredi: { ouverture: "08:00", fermeture: "16:30", ouvert: true },
    jeudi:    { ouverture: "08:00", fermeture: "16:30", ouvert: true },
    vendredi: { ouverture: "08:00", fermeture: "13:00", ouvert: true },
    samedi:   { ouverture: "09:00", fermeture: "13:00", ouvert: false },
    dimanche: { ouverture: "09:00", fermeture: "13:00", ouvert: false },
  },
  updated_at: now,
}

async function seed() {
  console.log("🌱 Démarrage du seed Supabase...")

  // Services
  console.log("  → Services...")
  const { error: sErr } = await supabase.from("services").upsert(SERVICES, { onConflict: "code" })
  if (sErr) throw sErr
  console.log(`     ✅ ${SERVICES.length} services créés`)

  // Guichets
  console.log("  → Guichets...")
  const { error: gErr } = await supabase.from("guichets").upsert(GUICHETS, { onConflict: "numero" })
  if (gErr) throw gErr
  console.log(`     ✅ ${GUICHETS.length} guichets créés`)

  // Paramètres agence
  console.log("  → Paramètres agence...")
  const { error: pErr } = await supabase.from("parametres").upsert(PARAMETRES, { onConflict: "id" })
  if (pErr) throw pErr
  console.log("     ✅ Paramètres définis")

  console.log("\n✅ Seed terminé avec succès !")
  console.log("\n⚠️  Pour créer le premier compte admin :")
  console.log("   Supabase Dashboard → Authentication → Users → Add user")
  console.log("   Puis insérer dans la table 'users' : { id: <uid>, role: 'admin', ... }")
}

seed().catch((e) => {
  console.error("❌ Erreur seed :", e)
  process.exit(1)
})
