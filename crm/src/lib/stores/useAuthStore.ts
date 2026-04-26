import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/crm'

interface AuthStore {
  user: User | null
  token: string | null
  _hasHydrated: boolean

  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,

      setAuth:    (user, token) => set({ user, token }),
      logout:     () => set({ user: null, token: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'edu-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
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
