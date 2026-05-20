"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabase"
import { loginSchema } from "@/lib/validations"
import { Lock, Eye, EyeOff, AlertCircle, Loader2, User, ArrowRight, Shield } from "lucide-react"
import Image from "next/image"
import type { UserRole } from "@/lib/types"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError || !data.session) {
        throw new Error(authError?.message ?? "Échec de la connexion")
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Échec de la connexion")
      }

      const { role } = (await res.json()) as { role: UserRole }

      const destination = redirectTo ?? roleToHome(role)
      window.location.href = destination
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue"
      setError(mapSupabaseError(message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Fond plein écran */}
      <Image
        src="/Vista-Bank.png"
        alt="Vista Bank"
        fill
        priority
        className="object-cover object-center"
      />

      {/* Overlay sombre global */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Dégradé rouge côté gauche */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(184,0,51,0.75) 0%, rgba(184,0,51,0.3) 35%, transparent 60%)",
        }}
      />

      {/* Carte de connexion */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Bandeau supérieur rouge */}
          <div className="bg-primary px-8 pt-8 pb-6 flex flex-col items-center text-center">
            {/* Logo bouclier */}
            <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mb-4 ring-2 ring-white/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              Vista Auth
            </h1>
            <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mt-1">
              Connexion Sécurisée
            </p>
          </div>

          {/* Formulaire */}
          <div className="px-8 py-7">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifiant */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Identifiant Institutionnel
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Entrez votre identifiant"
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    required
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary focus:bg-white transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold py-3.5 px-6 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-red-200/50 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion en cours…
                  </>
                ) : (
                  <>
                    Connexion Sécurisée
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center mt-5">
              <button className="text-xs text-slate-400 hover:text-primary transition-colors font-medium">
                Problème de connexion ?
              </button>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <p className="text-center text-[11px] text-white/50 mt-5 font-medium">
          © 2026 Vista Bank — Session chiffrée · Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  )
}

function roleToHome(role: UserRole): string {
  switch (role) {
    case "admin":      return "/admin"
    case "superviseur": return "/superviseur"
    case "caissier":   return "/caissier"
    case "borne":      return "/borne"
    default:           return "/"
  }
}

function mapSupabaseError(message: string): string {
  if (message.includes("Invalid login credentials") || message.includes("invalid_credentials"))
    return "Email ou mot de passe incorrect."
  if (message.includes("Email not confirmed"))
    return "Votre email n'a pas été confirmé."
  if (message.includes("too_many_requests") || message.includes("over_email_send_rate_limit"))
    return "Trop de tentatives. Réessayez dans quelques minutes."
  if (message.includes("network") || message.includes("fetch"))
    return "Erreur réseau. Vérifiez votre connexion."
  if (message.includes("Compte désactivé"))
    return "Ce compte a été désactivé. Contactez votre administrateur."
  return message
}
