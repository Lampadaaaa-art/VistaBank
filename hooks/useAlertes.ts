"use client"

import { useEffect, useState } from "react"
import type { Alerte } from "@/lib/types"

export function useAlertes(resolue = false) {
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlertes() {
      try {
        const res = await fetch(`/api/alertes?resolue=${resolue}`)
        if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return }
        const data = await res.json()
        setAlertes(Array.isArray(data) ? data : [])
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau")
      } finally {
        setLoading(false)
      }
    }

    fetchAlertes()
    const interval = setInterval(fetchAlertes, 3000)
    return () => clearInterval(interval)
  }, [resolue])

  return { alertes, loading, error }
}
