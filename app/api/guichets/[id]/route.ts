import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateGuichetSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    try {
      const json = await request.json()
      const data = updateGuichetSchema.parse(json)

      const { data: existing, error: fetchError } = await adminSupabase
        .from("guichets").select("id").eq("id", id).single()
      if (fetchError || !existing) return err("Guichet introuvable", 404)

      if (data.numero !== undefined) {
        const { data: dupNumero } = await adminSupabase
          .from("guichets").select("id").eq("numero", data.numero).neq("id", id).limit(1)
        if (dupNumero && dupNumero.length > 0)
          return err(`Le guichet numéro ${data.numero} existe déjà`, 409)
      }

      if (data.caissierUid) {
        const { data: dupCaissier } = await adminSupabase
          .from("guichets").select("id").eq("caissier_uid", data.caissierUid).neq("id", id).limit(1)
        if (dupCaissier && dupCaissier.length > 0)
          return err("Ce caissier est déjà assigné à un autre guichet", 409)
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.numero !== undefined)     updates.numero = data.numero
      if (data.nom !== undefined)        updates.nom = data.nom
      if (data.serviceCode !== undefined) updates.service_code = data.serviceCode
      if (data.caissierUid !== undefined) updates.caissier_uid = data.caissierUid ?? null
      if (data.statut !== undefined)     updates.statut = data.statut
      if ("ticketEnCours" in data)       updates.ticket_en_cours = data.ticketEnCours ?? null

      await adminSupabase.from("guichets").update(updates).eq("id", id)
      return ok({ id, ...updates })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la mise à jour", 500)
    }
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    const { data, error } = await adminSupabase.from("guichets").select("id").eq("id", id).single()
    if (error || !data) return err("Guichet introuvable", 404)
    await adminSupabase.from("guichets").delete().eq("id", id)
    return ok({ success: true })
  })
}
