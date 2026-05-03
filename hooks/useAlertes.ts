"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import type { Alerte } from "@/lib/types"

export function useAlertes(resolue = false) {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function fetchAlertes() {
      const { data, error: err } = await supabase
        .from("alertes")
        .select("*")
        .eq("resolue", resolue)
        .order("created_at", { ascending: false })
      if (err) { setError(err.message); return }
      setAlertes((data ?? []).map(mapAlerte))
      setLoading(false)
    }

    fetchAlertes()

    const channel = supabase
      .channel("alertes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alertes" }, fetchAlertes)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [resolue])

  return { alertes, loading, error }
}

function mapAlerte(row: Record<string, unknown>): Alerte {
  return {
    id:            row.id as string,
    type:          row.type as Alerte["type"],
    severite:      row.severite as Alerte["severite"],
    titre:         row.titre as string,
    message:       row.message as string,
    guichetId:     row.guichet_id as string | undefined,
    ticketId:      row.ticket_id as string | undefined,
    resolue:       row.resolue as boolean,
    resolueParUid: row.resolue_par_uid as string | undefined,
    resolueAt:     row.resolue_at as string | undefined,
    createdAt:     row.created_at as string,
  }
}
