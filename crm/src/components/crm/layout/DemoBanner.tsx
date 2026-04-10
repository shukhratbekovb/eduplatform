'use client'
import { FlaskConical, X, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'

export function DemoBanner() {
  const isDemoMode = useAuthStore((s) => s.isDemoMode)
  const logout     = useAuthStore((s) => s.logout)
  const router     = useRouter()

  if (!isDemoMode) return null

  const handleExit = () => {
    // Restore real adapter
    delete (apiClient.defaults as any).adapter
    logout()
    router.replace('/login')
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 px-4 py-2 bg-warning-400 text-warning-900 text-sm font-medium"
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span>
          Демо-режим — данные ненастоящие. Все изменения сбрасываются при перезагрузке.
        </span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 px-3 py-1 bg-warning-600 hover:bg-warning-700 text-white rounded text-xs font-semibold transition-colors shrink-0"
        aria-label="Выйти из демо-режима"
      >
        <LogOut className="w-3.5 h-3.5" />
        Выйти из демо
      </button>
    </div>
  )
}
