"use client"

import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // No user → useAuth redirects to "/", render nothing to avoid flash
  if (!user) return null

  return <>{children}</>
}
