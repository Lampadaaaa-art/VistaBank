import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { updateTicketSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    const { data, error } = await adminSupabase.from("tickets").select("*").eq("id", id).single()
    if (error || !data) return err("Ticket introuvable", 404)
    return ok(mapTicket(data))
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAuth(["admin", "superviseur", "caissier"], async (session) => {
    try {
      const json = await request.json()
      const data = updateTicketSchema.parse(json)

      const { data: ticket, error: fetchError } = await adminSupabase
        .from("tickets").select("*").eq("id", id).single()
      if (fetchError || !ticket) return err("Ticket introuvable", 404)

      const now = new Date().toISOString()
      const updates: Record<string, unknown> = {}

      if (data.statut) updates.statut = data.statut
      if (data.guichetId !== undefined) updates.guichet_id = data.guichetId ?? null
      if (data.notes !== undefined) updates.notes = data.notes

      if (data.statut === "en_cours") {
        updates.appelle_at = now
        updates.caissier_uid = session.uid
      }

      if (data.statut === "termine") {
        updates.termine_at = now
        if (ticket.appelle_at) {
          updates.temps_service = Math.round(
            (Date.now() - new Date(ticket.appelle_at as string).getTime()) / 1000
          )
        }
        updates.temps_attente = Math.round(
          (Date.now() - new Date(ticket.created_at as string).getTime()) / 1000
        )

        const guichetId = (data.guichetId ?? ticket.guichet_id) as string | undefined
        if (guichetId) {
          await adminSupabase
            .from("guichets")
            .update({ ticket_en_cours: null, updated_at: now })
            .eq("id", guichetId)
        }
      }

      if (data.statut === "en_cours" && data.guichetId) {
        await adminSupabase
          .from("guichets")
          .update({ ticket_en_cours: ticket.numero as string, statut: "ouvert", updated_at: now })
          .eq("id", data.guichetId)
      }

      await adminSupabase.from("tickets").update(updates).eq("id", id)
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
    const { data, error } = await adminSupabase.from("tickets").select("id").eq("id", id).single()
    if (error || !data) return err("Ticket introuvable", 404)
    await adminSupabase.from("tickets").delete().eq("id", id)
    return ok({ success: true })
  })
}

function mapTicket(row: Record<string, unknown>) {
  return {
    id:           row.id,
    numero:       row.numero,
    serviceCode:  row.service_code,
    serviceName:  row.service_name,
    priorite:     row.priorite,
    statut:       row.statut,
    guichetId:    row.guichet_id ?? undefined,
    caissierUid:  row.caissier_uid ?? undefined,
    createdAt:    row.created_at,
    appelleAt:    row.appelle_at ?? undefined,
    termineAt:    row.termine_at ?? undefined,
    tempsAttente: row.temps_attente ?? undefined,
    tempsService: row.temps_service ?? undefined,
    notes:        row.notes ?? undefined,
  }
}
