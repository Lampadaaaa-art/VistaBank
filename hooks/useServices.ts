"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import type { Service } from "@/lib/types"

export function useServices(actifsOnly = false) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function fetchServices() {
      let q = supabase.from("services").select("*").order("ordre", { ascending: true })
      if (actifsOnly) q = q.eq("actif", true)

      const { data, error: err } = await q
      if (err) { setError(err.message); return }
      setServices((data ?? []).map(mapService))
      setLoading(false)
    }

    fetchServices()

    const channel = supabase
      .channel("services-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, fetchServices)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [actifsOnly])

  return { services, loading, error }
}

function mapService(row: Record<string, unknown>): Service {
  return {
    id:          row.id as string,
    code:        row.code as string,
    nom:         row.nom as string,
    icone:       row.icone as string | undefined,
    tempsEstime: row.temps_estime as number,
    actif:       row.actif as boolean,
    ordre:       row.ordre as number,
  }
}
