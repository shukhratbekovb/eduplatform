import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Student } from '@/types/student'

interface AuthStore {
  student: Student | null
  token: string | null
  _hasHydrated: boolean

  setAuth: (student: Student, token: string) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      student: null,
      token: null,
      _hasHydrated: false,

      setAuth: (student, token) => set({ student, token }),
      logout: () => set({ student: null, token: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'student-auth',
      partialize: (s) => ({ student: s.student, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        // Sync cookie from localStorage for middleware auth check
        if (typeof document !== 'undefined' && state?.token) {
          document.cookie = `student-auth-token=${state.token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
        }
      },
    }
  )
)

// Selectors
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token && !!s.student)
export const useHasHydrated    = () => useAuthStore((s) => s._hasHydrated)
