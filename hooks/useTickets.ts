"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import type { Ticket, TicketStatut } from "@/lib/types"

export interface TicketFilters {
  statut?: TicketStatut | TicketStatut[]
  serviceCode?: string
  guichetId?: string
}

export function useTickets(filters?: TicketFilters) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function fetchTickets() {
      let q = supabase.from("tickets").select("*").order("created_at", { ascending: true })

      if (filters?.statut) {
        if (Array.isArray(filters.statut)) {
          q = q.in("statut", filters.statut)
        } else {
          q = q.eq("statut", filters.statut)
        }
      }
      if (filters?.serviceCode) q = q.eq("service_code", filters.serviceCode)
      if (filters?.guichetId)   q = q.eq("guichet_id", filters.guichetId)

      const { data, error: err } = await q
      if (err) { setError(err.message); return }
      setTickets((data ?? []).map(mapTicket))
      setLoading(false)
    }

    fetchTickets()

    const channel = supabase
      .channel("tickets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, fetchTickets)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    Array.isArray(filters?.statut) ? filters.statut.join(",") : filters?.statut,
    filters?.serviceCode,
    filters?.guichetId,
  ])

  return { tickets, loading, error }
}

function mapTicket(row: Record<string, unknown>): Ticket {
  return {
    id:           row.id as string,
    numero:       row.numero as string,
    serviceCode:  row.service_code as string,
    serviceName:  row.service_name as string,
    priorite:     row.priorite as Ticket["priorite"],
    statut:       row.statut as Ticket["statut"],
    guichetId:    row.guichet_id as string | undefined,
    caissierUid:  row.caissier_uid as string | undefined,
    createdAt:    row.created_at as string,
    appelleAt:    row.appelle_at as string | undefined,
    termineAt:    row.termine_at as string | undefined,
    tempsAttente: row.temps_attente as number | undefined,
    tempsService: row.temps_service as number | undefined,
    notes:        row.notes as string | undefined,
  }
}
