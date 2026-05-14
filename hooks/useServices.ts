"use client"

import { useEffect, useState, useCallback } from "react"
import type { Service } from "@/lib/types"

export function useServices(actifsOnly = false) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const url = actifsOnly ? "/api/public/services" : "/api/services"

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) { setError(`HTTP ${res.status}`); setLoading(false); return }
      const data = await res.json()
      setServices(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau")
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchServices()
    const interval = setInterval(fetchServices, 3000)
    return () => clearInterval(interval)
  }, [fetchServices])

  return { services, loading, error, refresh: fetchServices }
}
