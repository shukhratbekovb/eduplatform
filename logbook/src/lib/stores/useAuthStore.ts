/**
 * Стор аутентификации LMS (Zustand + persist).
 *
 * Хранит текущего пользователя и JWT-токен в localStorage.
 * Поддерживает гидратацию на клиенте (SSR-safe).
 *
 * Экспортирует набор селекторов-хуков для проверки ролей:
 * - useIsDirector, useIsMup, useIsTeacher, useIsCashier
 * - useIsDirectorOrMup — для объединённых проверок
 * - useIsAuthenticated — наличие токена и пользователя
 *
 * @module useAuthStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/lms'

/** Интерфейс стора аутентификации */
interface AuthStore {
  user:            User | null
  token:           string | null
  _hasHydrated:    boolean

  setAuth:         (user: User, token: string) => void
  logout:          () => void
  setHasHydrated:  (v: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      _hasHydrated:    false,

      setAuth:    (user, token) => set({ user, token }),
      logout:     () => set({ user: null, token: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'edu-lms-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
      // Колбэк после восстановления данных из localStorage (SSR-safe)
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// ── Селекторы-хуки для удобного доступа к данным и проверки ролей ─────────
export const useCurrentUser    = () => useAuthStore((s) => s.user)
export const useUserRole       = () => useAuthStore((s) => s.user?.role)
export const useIsDirector     = () => useAuthStore((s) => s.user?.role === 'director')
export const useIsMup          = () => useAuthStore((s) => s.user?.role === 'mup')
export const useIsTeacher      = () => useAuthStore((s) => s.user?.role === 'teacher')
export const useIsDirectorOrMup = () => useAuthStore((s) => s.user?.role === 'director' || s.user?.role === 'mup')
export const useIsCashier      = () => useAuthStore((s) => s.user?.role === 'cashier')
export const useAuthToken      = () => useAuthStore((s) => s.token)
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token && !!s.user)
export const useHasHydrated    = () => useAuthStore((s) => s._hasHydrated)
