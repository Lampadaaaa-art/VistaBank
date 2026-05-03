"use client"

import { useEffect, useState, useCallback } from "react"
import type { User as AppUser } from "@/lib/types"

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/users", { cache: 'no-store' })
      if (res.ok) {
        const data: AppUser[] = await res.json()
        setUsers(data.sort((a, b) => a.nom.localeCompare(b.nom)))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { users, loading, refresh }
}
