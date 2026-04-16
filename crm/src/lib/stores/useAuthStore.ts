import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/crm'

interface AuthStore {
  user: User | null
  token: string | null
  isDemoMode: boolean
  _hasHydrated: boolean

  setAuth: (user: User, token: string) => void
  logout: () => void
  enableDemo: (user: User, token: string) => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isDemoMode: false,
      _hasHydrated: false,

      setAuth:    (user, token) => set({ user, token, isDemoMode: false }),
      logout:     () => set({ user: null, token: null, isDemoMode: false }),
      enableDemo: (user, token) => set({ user, token, isDemoMode: true }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'edu-auth',
      partialize: (s) => ({ token: s.token, user: s.user, isDemoMode: s.isDemoMode }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// Selectors
export const useCurrentUser  = () => useAuthStore((s) => s.user)
export const useUserRole     = () => useAuthStore((s) => s.user?.role)
export const useIsDirector   = () => useAuthStore((s) => s.user?.role === 'director')
export const useAuthToken    = () => useAuthStore((s) => s.token)
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token && !!s.user)
export const useHasHydrated  = () => useAuthStore((s) => s._hasHydrated)
