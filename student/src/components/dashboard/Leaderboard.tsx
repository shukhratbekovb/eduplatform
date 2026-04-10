'use client'
import { useState } from 'react'
import { Star, Info } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { LeaderboardEntry } from '@/types/student'

interface Props { entries: LeaderboardEntry[]; isLoading?: boolean }

const rankColors: Record<number, string> = { 1: 'text-warning-500', 2: 'text-gray-400', 3: 'text-warning-700' }

export function Leaderboard({ entries, isLoading }: Props) {
  const t = useT()
  const [period, setPeriod] = useState<'30d' | 'all'>('30d')
  const [showHint, setShowHint] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-700">{t('dashboard.leaderboard')}</h3>
        <div className="flex items-center gap-1">
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setShowHint((v) => !v)}>
            <Info className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-400">{t('dashboard.leaderboard.group')}</span>
        </div>
      </div>

      {/* Period toggle */}
      <div className="flex bg-gray-100 rounded-lg p-0.5 mb-3">
        {(['30d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex-1 text-xs py-1 rounded-md transition-colors font-medium',
              period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            )}
          >
            {p === '30d' ? t('dashboard.leaderboard.30d') : t('dashboard.leaderboard.all')}
          </button>
        ))}
      </div>

      {/* Hint */}
      {showHint && (
        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 mb-3 leading-relaxed">
          {t('dashboard.leaderboard.hint')}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex gap-3 items-center animate-pulse">
              <div className="w-5 h-4 bg-gray-100 rounded" />
              <div className="w-7 h-7 bg-gray-100 rounded-full" />
              <div className="flex-1 h-3 bg-gray-100 rounded" />
              <div className="w-10 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {entries.map((entry) => (
            <div
              key={entry.studentId}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                entry.isCurrentUser ? 'bg-primary-50 ring-1 ring-primary-100' : 'hover:bg-gray-50'
              )}
            >
              <span className={cn('text-xs font-bold w-4 text-center shrink-0', rankColors[entry.rank] ?? 'text-gray-400')}>
                {entry.rank}
              </span>
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                {entry.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
              <p className={cn(
                'flex-1 text-xs truncate',
                entry.isCurrentUser ? 'font-semibold text-primary-700' : 'text-gray-700'
              )}>
                {entry.fullName}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3 h-3 fill-warning-400 text-warning-400" />
                <span className="text-xs font-semibold text-gray-600">{entry.points.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
