"use client"

import { useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import type { UserRole } from "@/lib/types"

export function useAuth() {
  const { user, loading, setUser } = useAuthStore()

  useEffect(() => {
    const supabase = getSupabaseClient()
    let userChannel: ReturnType<typeof supabase.channel> | null = null

    const markOffline = async (uid: string) => {
      await supabase
        .from("presence")
        .upsert({ user_id: uid, en_ligne: false, depuis: new Date().toISOString() })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (userChannel) {
        await supabase.removeChannel(userChannel)
        userChannel = null
      }

      if (!session?.user) {
        setUser(null)
        return
      }

      const uid = session.user.id

      try {
        const { data: userData } = await supabase
          .from("users")
          .select("nom, prenom, role, guichet_id, statut")
          .eq("id", uid)
          .single()

        if (!userData) { setUser(null); return }

        if (userData.statut === "inactif") {
          await supabase.auth.signOut()
          return
        }

        setUser({
          uid,
          email: session.user.email!,
          nom: userData.nom,
          prenom: userData.prenom,
          role: userData.role as UserRole,
          guichetId: userData.guichet_id ?? undefined,
        })

        await supabase
          .from("presence")
          .upsert({ user_id: uid, en_ligne: true, depuis: new Date().toISOString() })

        // Écouter les changements de statut sur la propre ligne users (ex : admin désactive le compte)
        let isFirst = true
        userChannel = supabase
          .channel(`user-doc-${uid}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${uid}` },
            async (payload) => {
              if (isFirst) { isFirst = false; return }
              if ((payload.new as Record<string, unknown>).statut === "inactif") {
                await markOffline(uid)
                await supabase.auth.signOut()
              }
            }
          )
          .subscribe()
      } catch {
        setUser(null)
      }
    })

    const handleBeforeUnload = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) markOffline(data.user.id)
      })
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      if (userChannel) supabase.removeChannel(userChannel)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [setUser])

  return { user, loading }
}
