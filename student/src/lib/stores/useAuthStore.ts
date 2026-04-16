import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Student } from '@/types/student'

interface AuthStore {
  student: Student | null
  token: string | null
  isDemoMode: boolean
  _hasHydrated: boolean

  setAuth: (student: Student, token: string) => void
  enableDemo: (student: Student, token: string) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      student: null,
      token: null,
      isDemoMode: false,
      _hasHydrated: false,

      setAuth: (student, token) => set({ student, token, isDemoMode: false }),
      enableDemo: (student, token) => set({ student, token, isDemoMode: true }),
      logout: () => set({ student: null, token: null, isDemoMode: false }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'student-auth',
      partialize: (s) => ({ student: s.student, token: s.token, isDemoMode: s.isDemoMode }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// Selectors
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token && !!s.student)
export const useHasHydrated    = () => useAuthStore((s) => s._hasHydrated)
