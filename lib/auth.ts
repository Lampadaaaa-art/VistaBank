import { adminSupabase } from "@/lib/supabase-admin"
import { cookies } from "next/headers"
import type { SessionUser, UserRole } from "@/lib/types"

const SESSION_COOKIE = "__session"
const ROLE_COOKIE = "__role"
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000 // 5 jours

// Identique à l'original — aucun lien Firebase
async function signRole(role: string): Promise<string> {
  const secret = process.env.COOKIE_SECRET
  if (!secret) return role
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(role))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
  return `${role}.${hex}`
}

export async function createSession(accessToken: string): Promise<SessionUser> {
  const { data: { user }, error } = await adminSupabase.auth.getUser(accessToken)
  if (error || !user) throw new Error("Token invalide")

  const { data: userData, error: userError } = await adminSupabase
    .from("users")
    .select("nom, prenom, role, guichet_id, statut")
    .eq("id", user.id)
    .single()

  if (userError || !userData) throw new Error("Utilisateur introuvable en base")
  if (userData.statut === "inactif") throw new Error("Compte désactivé")

  const sessionUser: SessionUser = {
    uid: user.id,
    email: user.email!,
    nom: userData.nom,
    prenom: userData.prenom,
    role: userData.role as UserRole,
    guichetId: userData.guichet_id ?? undefined,
  }

  const cookieStore = await cookies()
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  }

  cookieStore.set(SESSION_COOKIE, accessToken, cookieOptions)
  cookieStore.set(ROLE_COOKIE, await signRole(sessionUser.role), cookieOptions)

  return sessionUser
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(SESSION_COOKIE)?.value
  if (!accessToken) {
    console.warn("[auth] getSession: cookie __session absent")
    return null
  }

  try {
    const { data: { user }, error } = await adminSupabase.auth.getUser(accessToken)
    if (error || !user) {
      console.warn("[auth] getSession: auth.getUser() échoué —", error?.message ?? "user null")
      return null
    }

    const { data: userData, error: userError } = await adminSupabase
      .from("users")
      .select("nom, prenom, role, guichet_id, statut")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      console.warn("[auth] getSession: utilisateur introuvable en base pour uid", user.id, "—", userError?.message)
      return null
    }

    return {
      uid: user.id,
      email: user.email!,
      nom: userData.nom,
      prenom: userData.prenom,
      role: userData.role as UserRole,
      guichetId: userData.guichet_id ?? undefined,
      statut: userData.statut as import("@/lib/types").UserStatut,
    }
  } catch (e) {
    console.error("[auth] getSession: erreur inattendue —", e)
    return null
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(ROLE_COOKIE)
}

export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error("Non authentifié")
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error("Accès refusé")
  }
  return session
}
