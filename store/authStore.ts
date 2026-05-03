import { create } from "zustand"
import type { SessionUser } from "@/lib/types"

interface AuthState {
  user: SessionUser | null
  loading: boolean
  setUser: (user: SessionUser | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
}))
