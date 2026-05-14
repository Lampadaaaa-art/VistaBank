"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Ticket, TicketStatut } from "@/lib/types"

export interface TicketFilters {
  statut?: TicketStatut | TicketStatut[]
  serviceCode?: string
  guichetId?: string
  dateFrom?: Date
  publicMode?: boolean
}

export function useTickets(filters?: TicketFilters) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const publicMode = filters?.publicMode ?? false
  const statutKey = Array.isArray(filters?.statut) ? filters.statut.join(",") : filters?.statut

  const fetchRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const initialized = { current: false }

    async function fetchTickets() {
      const base = publicMode ? "/api/public/queue" : "/api/tickets"
      const params = new URLSearchParams()

      if (filters?.statut) {
        params.set(
          "statut",
          Array.isArray(filters.statut) ? filters.statut.join(",") : filters.statut
        )
      }
      if (filters?.serviceCode) params.set("serviceCode", filters.serviceCode)
      if (filters?.guichetId) params.set("guichetId", filters.guichetId)
      if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom.toISOString())

      const url = params.toString() ? `${base}?${params}` : base

      try {
        const res = await fetch(url, { cache: "no-store" })
        // On 401 before first success, the auth cookie is still syncing — stay in loading state.
        if (res.status === 401 && !initialized.current) return
        if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return }
        const data = await res.json()
        initialized.current = true
        setTickets(Array.isArray(data) ? data : [])
        setError(null)
        setLoading(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau")
        setLoading(false)
      }
    }

    fetchRef.current = fetchTickets
    fetchTickets()
    const interval = setInterval(fetchTickets, 3000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    publicMode,
    statutKey,
    filters?.serviceCode,
    filters?.guichetId,
    filters?.dateFrom?.toISOString(),
  ])

  const refresh = useCallback(() => {
    fetchRef.current?.()
  }, [])

  return { tickets, loading, error, refresh }
}
