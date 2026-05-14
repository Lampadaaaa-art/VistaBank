/**
 * Crée le premier compte administrateur dans Supabase Auth + table users.
 *
 * Usage :
 *   npx tsx scripts/create-admin.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import { resolve } from "path"
import * as readline from "readline"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res))

async function main() {
  console.log("=== Création du premier administrateur Vista Gui ===\n")

  const email    = await ask("Email        : ")
  const password = await ask("Mot de passe : ")
  const nom      = await ask("Nom          : ")
  const prenom   = await ask("Prénom       : ")
  rl.close()

  // 1. Créer dans Supabase Auth
  console.log("\nCréation du compte Auth…")
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nom, prenom },
  })
  if (authErr) { console.error("❌ Auth:", authErr.message); process.exit(1) }
  const uid = authData.user.id

  // 2. Insérer dans la table users
  console.log("Insertion dans la table users…")
  const { error: dbErr } = await supabase.from("users").insert({
    id:     uid,
    email,
    nom,
    prenom,
    role:   "admin",
    statut: "actif",
  })
  if (dbErr) {
    await supabase.auth.admin.deleteUser(uid)
    console.error("❌ DB:", dbErr.message)
    process.exit(1)
  }

  console.log(`\n✅ Administrateur créé avec succès !`)
  console.log(`   Email  : ${email}`)
  console.log(`   UID    : ${uid}`)
  console.log(`\nVous pouvez maintenant vous connecter sur /login`)
}

main().catch((e) => { console.error("❌", e); process.exit(1) })
