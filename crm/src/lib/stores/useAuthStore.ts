import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/crm'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isDemoMode: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  enableDemo: (user: User, token: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isDemoMode: false,
      setAuth:    (user, token) => set({ user, token, isAuthenticated: true, isDemoMode: false }),
      logout:     () => set({ user: null, token: null, isAuthenticated: false, isDemoMode: false }),
      enableDemo: (user, token) => set({ user, token, isAuthenticated: true, isDemoMode: true }),
    }),
    {
      name: 'edu-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
)

// Selectors
export const useCurrentUser  = () => useAuthStore((s) => s.user)
export const useUserRole     = () => useAuthStore((s) => s.user?.role)
export const useIsDirector   = () => useAuthStore((s) => s.user?.role === 'director')
export const useAuthToken    = () => useAuthStore((s) => s.token)
