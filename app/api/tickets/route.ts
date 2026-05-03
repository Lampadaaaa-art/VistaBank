import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err, withAuth, handleZodError } from "@/lib/api-helpers"
import { createTicketSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(request: NextRequest) {
  return withAuth(["admin", "superviseur", "caissier"], async () => {
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get("statut")
    const serviceCode = searchParams.get("serviceCode")

    let q = adminSupabase.from("tickets").select("*").order("created_at", { ascending: true })

    if (statut) q = q.eq("statut", statut)
    if (serviceCode) q = q.eq("service_code", serviceCode)

    const { data, error } = await q
    if (error) return err("Erreur lors de la récupération des tickets", 500)

    return ok((data ?? []).map(mapTicket))
  })
}

export async function POST(request: NextRequest) {
  return withAuth(["admin", "caissier"], async () => {
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
      return ok(mapTicket(ticket), 201)
    } catch (e) {
      if (e instanceof ZodError) return handleZodError(e)
      return err("Erreur lors de la création du ticket", 500)
    }
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
