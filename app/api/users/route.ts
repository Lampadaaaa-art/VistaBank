import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { createUserSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  return withAuth(["admin"], async () => {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .order("nom", { ascending: true })

    if (error) return err("Erreur lors de la récupération des utilisateurs", 500)
    return ok((data ?? []).map(mapUser))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = createUserSchema.parse(json)

      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        user_metadata: { nom: data.nom, prenom: data.prenom },
        email_confirm: true,
      })

      if (authError) {
        console.error("[POST /api/users] auth.admin.createUser error:", authError.message)
        if (
          authError.message.includes("already registered") ||
          authError.message.includes("already been registered") ||
          authError.message.includes("already exists")
        )
          return err("Cette adresse email est déjà utilisée", 409)
        return err(`Erreur auth Supabase : ${authError.message}`, 500)
      }

      const insertPayload: Record<string, unknown> = {
        id:     authData.user.id,
        email:  data.email,
        nom:    data.nom,
        prenom: data.prenom,
        role:   data.role,
        statut: data.statut,
      }
      if (data.guichetId) {
        insertPayload.guichet_id = data.guichetId
        // Release any existing caissier assigned to this guichet to avoid duplicates
        await adminSupabase.from("users").update({ guichet_id: null }).eq("guichet_id", data.guichetId)
      }
      if (data.servicesAutorises && data.servicesAutorises.length > 0) {
        insertPayload.services_autorises = data.servicesAutorises
      }
      const { data: userDoc, error: dbError } = await adminSupabase
        .from("users")
        .insert(insertPayload)
        .select()
        .single()

      if (dbError) {
        console.error("[POST /api/users] DB insert error:", dbError.message, dbError.code)
        await adminSupabase.auth.admin.deleteUser(authData.user.id)
        return err(`Erreur base de données : ${dbError.message}`, 500)
      }

      return ok(mapUser(userDoc), 201)
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      console.error("[POST /api/users] unexpected error:", e)
      return err("Erreur lors de la création de l'utilisateur", 500)
    }
  })
}

function mapUser(row: Record<string, unknown>) {
  return {
    id:                row.id,
    email:             row.email,
    nom:               row.nom,
    prenom:            row.prenom,
    role:              row.role,
    guichetId:         row.guichet_id ?? undefined,
    servicesAutorises: row.services_autorises ?? [],
    statut:            row.statut,
    createdAt:         row.created_at,
    updatedAt:         row.updated_at,
  }
}
