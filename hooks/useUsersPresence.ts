"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"

export function useUsersPresence(): Record<string, boolean> {
  const [presences, setPresences] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function fetchPresence() {
      const { data } = await supabase.from("presence").select("user_id, en_ligne")
      const map: Record<string, boolean> = {}
      for (const row of data ?? []) map[row.user_id] = row.en_ligne === true
      setPresences(map)
    }

    fetchPresence()

    const channel = supabase
      .channel("presence-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, fetchPresence)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return presences
}
