"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import type { Guichet } from "@/lib/types"

export function useGuichets(publicMode = false) {
  const [guichets, setGuichets] = useState<Guichet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initializedRef = useRef(false)

  const url = publicMode ? "/api/public/guichets" : "/api/guichets"

  const fetchGuichets = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" })
      // On 401 before the first successful load, the auth cookie is likely still being
      // synced by useAuth — stay in loading state and retry on the next poll.
      if (res.status === 401 && !initializedRef.current) return
      if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return }
      const data = await res.json()
      initializedRef.current = true
      setGuichets(Array.isArray(data) ? data : [])
      setError(null)
      setLoading(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau")
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchGuichets()
    const interval = setInterval(fetchGuichets, 3000)
    return () => clearInterval(interval)
  }, [fetchGuichets])

  return { guichets, loading, error, refresh: fetchGuichets }
}
