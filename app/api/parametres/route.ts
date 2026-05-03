import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateParametresSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET() {
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    const { data, error } = await adminSupabase
      .from("parametres").select("*").eq("id", "agence").single()
    if (error || !data) return err("Paramètres non configurés", 404)
    return ok(mapParametres(data))
  })
}

export async function PATCH(request: NextRequest) {
  return withAuth(["admin"], async () => {
    try {
      const json = await request.json()
      const data = updateParametresSchema.parse(json)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.nom !== undefined)                    updates.nom = data.nom
      if (data.adresse !== undefined)                updates.adresse = data.adresse
      if (data.telephone !== undefined)              updates.telephone = data.telephone ?? null
      if (data.logo !== undefined)                   updates.logo = data.logo ?? null
      if (data.horaires !== undefined)               updates.horaires = data.horaires
      if (data.voixActive !== undefined)             updates.voix_active = data.voixActive
      if (data.seuilTempsAttente !== undefined)      updates.seuil_temps_attente = data.seuilTempsAttente
      if (data.seuilInactiviteGuichet !== undefined) updates.seuil_inactivite_guichet = data.seuilInactiviteGuichet

      await adminSupabase.from("parametres").update(updates).eq("id", "agence")
      return ok({ id: "agence", ...data })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la mise à jour des paramètres", 500)
    }
  })
}

function mapParametres(row: Record<string, unknown>) {
  return {
    id:                      row.id,
    nom:                     row.nom,
    adresse:                 row.adresse,
    telephone:               row.telephone ?? undefined,
    logo:                    row.logo ?? undefined,
    horaires:                row.horaires,
    voixActive:              row.voix_active,
    seuilTempsAttente:       row.seuil_temps_attente,
    seuilInactiviteGuichet:  row.seuil_inactivite_guichet,
    updatedAt:               row.updated_at,
  }
}
