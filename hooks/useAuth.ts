"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { useAuthStore } from "@/store/authStore"
import type { UserRole } from "@/lib/types"
import type { Session } from "@supabase/supabase-js"

const PROTECTED_PREFIXES = ["/admin", "/superviseur", "/caissier", "/borne"]

export function useAuth() {
  const { user, loading, setUser } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const supabase = getSupabaseClient()
    let statutInterval: ReturnType<typeof setInterval> | null = null

    const markOffline = async (uid: string) => {
      await supabase
        .from("presence")
        .upsert({ user_id: uid, en_ligne: false, depuis: new Date().toISOString() })
    }

    const clearStatutInterval = () => {
      if (statutInterval) { clearInterval(statutInterval); statutInterval = null }
    }

    async function loadUser(session: Session | null) {
      clearStatutInterval()
      if (!session?.user) {
        // No browser session — clear the stale server cookie and redirect if on a protected route
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
        setUser(null)
        const current = pathnameRef.current ?? "/"
        const isProtected = PROTECTED_PREFIXES.some(p => current.startsWith(p))
        if (isProtected) router.replace(`/login?redirect=${encodeURIComponent(current)}`)
        return
      }
      const uid = session.user.id

      // Always sync the server cookie with the current access token before any API call.
      // This prevents 401 loops when the cookie holds an expired token but the browser
      // session is still valid (e.g., after Supabase silently refreshed the token).
      if (session.access_token) {
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token }),
        }).catch(() => {})
      }

      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" })
        if (!res.ok) { setUser(null); return }
        const userData = await res.json()
        if (userData.statut === "inactif") { await supabase.auth.signOut(); return }
        setUser({
          uid,
          email: session.user.email!,
          nom: userData.nom,
          prenom: userData.prenom,
          role: userData.role as UserRole,
          guichetId: userData.guichetId,
        })
        await supabase.from("presence").upsert({ user_id: uid, en_ligne: true, depuis: new Date().toISOString() })
        statutInterval = setInterval(async () => {
          const r = await fetch("/api/auth/me", { cache: "no-store" })
          if (!r.ok) { clearStatutInterval(); await markOffline(uid); await supabase.auth.signOut(); return }
          const d = await r.json()
          if (d.statut === "inactif") { clearStatutInterval(); await markOffline(uid); await supabase.auth.signOut() }
        }, 10000)
      } catch { setUser(null) }
    }

    // Load session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => loadUser(session))

    // Re-sync on auth state changes.
    // INITIAL_SESSION is already handled by getSession() above — skipping it prevents
    // a race condition where onAuthStateChange fires with null before the browser has
    // read the session cookies, causing a premature logout that deletes the __session cookie.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return
      loadUser(session)
    })

    const handleBeforeUnload = () => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) markOffline(data.user.id)
      })
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      subscription.unsubscribe()
      clearStatutInterval()
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [setUser, router])

  return { user, loading }
}
