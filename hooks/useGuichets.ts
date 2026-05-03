"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import type { Guichet } from "@/lib/types"

export function useGuichets() {
  const [guichets, setGuichets] = useState<Guichet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function fetchGuichets() {
      const { data, error: err } = await supabase
        .from("guichets")
        .select("*")
        .order("numero", { ascending: true })
      if (err) { setError(err.message); return }
      setGuichets((data ?? []).map(mapGuichet))
      setLoading(false)
    }

    fetchGuichets()

    const channel = supabase
      .channel("guichets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "guichets" }, fetchGuichets)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { guichets, loading, error }
}

function mapGuichet(row: Record<string, unknown>): Guichet {
  return {
    id:            row.id as string,
    numero:        row.numero as number,
    nom:           row.nom as string,
    serviceCode:   row.service_code as string,
    caissierUid:   row.caissier_uid as string | undefined,
    statut:        row.statut as Guichet["statut"],
    ticketEnCours: row.ticket_en_cours as string | undefined,
    updatedAt:     row.updated_at as string,
  }
}
