'use client'
import { FlaskConical } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/useAuthStore'

const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  mup:      'МУП (Академический менеджер)',
  teacher:  'Преподаватель',
}

export function DemoBanner() {
  const isDemoMode = useAuthStore((s) => s.isDemoMode)
  const user       = useAuthStore((s) => s.user)

  if (!isDemoMode) return null

  return (
    <div className="bg-warning-50 border-b border-warning-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-warning-700">
      <FlaskConical className="w-4 h-4 shrink-0" />
      <span>
        Демо-режим — роль: <strong>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</strong>.
        Данные сбрасываются при перезагрузке.
      </span>
    </div>
  )
}
