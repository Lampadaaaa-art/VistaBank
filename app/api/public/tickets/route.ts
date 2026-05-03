import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err } from "@/lib/api-helpers"
import { createTicketSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const data = createTicketSchema.parse(json)

    const { data: numero, error: fnError } = await adminSupabase
      .rpc("next_ticket_numero", { p_service_code: data.serviceCode })
    if (fnError) return err("Erreur compteur", 500)

    const { data: ticket, error: insertError } = await adminSupabase
      .from("tickets")
      .insert({
        numero: numero as string,
        service_code: data.serviceCode,
        service_name: data.serviceName,
        priorite: data.priorite,
        statut: "attente",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) return err("Erreur lors de la création du ticket", 500)

    return ok({
      id:          ticket.id,
      numero:      ticket.numero,
      serviceCode: ticket.service_code,
      serviceName: ticket.service_name,
      priorite:    ticket.priorite,
      statut:      ticket.statut,
      createdAt:   ticket.created_at,
    }, 201)
  } catch (e) {
    if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Données invalides", 422)
    return err("Erreur lors de la création du ticket", 500)
  }
}
