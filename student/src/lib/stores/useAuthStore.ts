import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Student } from '@/types/student'

interface AuthStore {
  student: Student | null
  token: string | null
  isAuthenticated: boolean
  isDemoMode: boolean
  setAuth: (student: Student, token: string) => void
  enableDemo: (student: Student, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      student: null,
      token: null,
      isAuthenticated: false,
      isDemoMode: false,
      setAuth: (student, token) => set({ student, token, isAuthenticated: true, isDemoMode: false }),
      enableDemo: (student, token) => set({ student, token, isAuthenticated: true, isDemoMode: true }),
      logout: () => set({ student: null, token: null, isAuthenticated: false, isDemoMode: false }),
    }),
    {
      name: 'student-auth',
      partialize: (s) => ({ student: s.student, token: s.token, isAuthenticated: s.isAuthenticated, isDemoMode: s.isDemoMode }),
    }
  )
)
