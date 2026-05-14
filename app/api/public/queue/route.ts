import { NextRequest } from "next/server"
import { adminSupabase } from "@/lib/supabase-admin"
import { ok, err } from "@/lib/api-helpers"

export async function GET(request: NextRequest) {
  try {
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
  } catch {
    return err("Erreur lors de la récupération des tickets", 500)
  }
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
