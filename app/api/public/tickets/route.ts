import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err } from "@/lib/api-helpers"
import { createTicketSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const data = createTicketSchema.parse(json)

    const { data: rpcResult, error: fnError } = await adminSupabase
      .rpc("next_ticket_numero", { p_service_code: data.serviceCode })

    let numero: string
    if (fnError || !rpcResult) {
      const { data: lastTickets } = await adminSupabase
        .from("tickets")
        .select("numero")
        .eq("service_code", data.serviceCode)
        .order("created_at", { ascending: false })
        .limit(1)
      const last = lastTickets?.[0]?.numero as string | undefined
      if (last) {
        const m = last.match(/^([A-Z]+)-(\d+)$/)
        numero = m ? `${m[1]}-${String(parseInt(m[2]) + 1).padStart(3, "0")}` : `${data.serviceCode}-001`
      } else {
        numero = `${data.serviceCode}-001`
      }
    } else {
      numero = rpcResult as string
    }

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

    if (insertError) {
      console.error("[POST /api/public/tickets] insert error:", insertError)
      return err(`Erreur base de données: ${insertError.message}`, 500)
    }

    return ok({
      id:          ticket.id,
      numero:      ticket.numero,
      serviceCode: ticket.service_code,
      serviceName: data.serviceName,
      priorite:    ticket.priorite,
      statut:      ticket.statut,
      createdAt:   ticket.created_at,
    }, 201)
  } catch (e) {
    if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Données invalides", 422)
    return err("Erreur lors de la création du ticket", 500)
  }
}
