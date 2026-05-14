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
    const guichetId = searchParams.get("guichetId")
    const dateFrom = searchParams.get("dateFrom")

    let q = adminSupabase.from("tickets").select("*").order("created_at", { ascending: true })

    if (statut) {
      const statuts = statut.split(",").map((s) => s.trim()).filter(Boolean)
      if (statuts.length > 1) {
        q = q.in("statut", statuts)
      } else {
        q = q.eq("statut", statuts[0])
      }
    }
    if (serviceCode) q = q.eq("service_code", serviceCode)
    if (guichetId) q = q.eq("guichet_id", guichetId)
    if (dateFrom) q = q.gte("created_at", dateFrom)

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

      if (insertError) return err("Erreur lors de la création du ticket", 500)
      return ok({ ...mapTicket(ticket), serviceName: data.serviceName }, 201)
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
    serviceName:  (row.service_name ?? row.service_code) as string,
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
