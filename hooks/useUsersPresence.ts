"use client"

import { useEffect, useState } from "react"

export function useUsersPresence(): Record<string, boolean> {
  const [presences, setPresences] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function fetchPresence() {
      try {
        const res = await fetch("/api/presence")
        if (!res.ok) return
        const data = await res.json()
        if (data && typeof data === "object") setPresences(data)
      } catch {
        // silently ignore — presence is non-critical
      }
    }

    fetchPresence()
    const interval = setInterval(fetchPresence, 3000)
    return () => clearInterval(interval)
  }, [])

  return presences
}
