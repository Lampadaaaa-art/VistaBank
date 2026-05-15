'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function AdminLogoutButton() {
  const router = useRouter()
  const { user } = useAuthStore()

  const handleLogout = async () => {
    const supabase = getSupabaseClient()

    if (user?.uid) {
      try {
        await supabase
          .from('presence')
          .upsert({ user_id: user.uid, en_ligne: false, depuis: new Date().toISOString() })
      } catch {
        // best-effort
      }
    }

    await supabase.auth.signOut()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-3 text-secondary px-4 py-3 hover:bg-white/50 rounded-xl transition-all font-headline text-sm font-bold w-full"
    >
      <LogOut className="w-5 h-5" />
      Déconnexion
    </button>
  )
}
