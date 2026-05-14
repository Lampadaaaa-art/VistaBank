import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateGuichetSchema } from "@/lib/validations"
import { ZodError } from "zod"

// The guichets table has no caissier_uid column.
// Caissier assignment is tracked via users.guichet_id.

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    try {
      const json = await request.json()
      const data = updateGuichetSchema.parse(json)

      if (data.numero !== undefined) {
        const { data: dupNumero } = await adminSupabase
          .from("guichets").select("id").eq("numero", data.numero).neq("id", id).limit(1)
        if (dupNumero && dupNumero.length > 0)
          return err(`Le guichet numéro ${data.numero} existe déjà`, 409)
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (data.numero !== undefined)      updates.numero = data.numero
      if (data.nom !== undefined)         updates.nom = data.nom
      if (data.serviceCode !== undefined) updates.service_code = data.serviceCode
      if (data.statut !== undefined)      updates.statut = data.statut
      if ("ticketEnCours" in data)        updates.ticket_en_cours = data.ticketEnCours ?? null

      const { data: updated, error: updateError } = await adminSupabase
        .from("guichets").update(updates).eq("id", id).select().single()

      if (updateError) {
        if (updateError.code === "PGRST116") return err("Guichet introuvable", 404)
        return err(`Erreur lors de la mise à jour: ${updateError.message}`, 500)
      }

      // Manage caissier assignment via users table
      if (data.caissierUid !== undefined) {
        // Release all caissiers currently assigned to this guichet
        const { error: clearErr } = await adminSupabase.from("users").update({ guichet_id: null }).eq("guichet_id", id)
        if (clearErr) return err(`Erreur lors de la libération du guichet : ${clearErr.message}`, 500)
        // Assign the new caissier if provided
        if (data.caissierUid) {
          const { error: assignErr } = await adminSupabase.from("users").update({ guichet_id: id }).eq("id", data.caissierUid)
          if (assignErr) return err(`Erreur lors de l'affectation du caissier : ${assignErr.message}`, 500)
        }
      }

      // Resolve current caissier for response
      const { data: caissier } = await adminSupabase
        .from("users").select("id").eq("guichet_id", id).maybeSingle()

      return ok({ ...mapGuichet(updated as Record<string, unknown>), caissierUid: caissier?.id })
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la mise à jour", 500)
    }
  })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin"], async () => {
    // Release caissier assignment before deleting
    await adminSupabase.from("users").update({ guichet_id: null }).eq("guichet_id", id)
    const { error } = await adminSupabase.from("guichets").delete().eq("id", id)
    if (error) return err(`Erreur lors de la suppression: ${error.message}`, 500)
    return ok({ success: true })
  })
}

function mapGuichet(row: Record<string, unknown>) {
  return {
    id:            row.id,
    numero:        row.numero,
    nom:           row.nom,
    serviceCode:   row.service_code,
    statut:        row.statut,
    ticketEnCours: row.ticket_en_cours ?? undefined,
    updatedAt:     row.updated_at,
  }
}
