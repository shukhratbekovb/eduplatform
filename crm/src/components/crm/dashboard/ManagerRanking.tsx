'use client'
import { Trophy } from 'lucide-react'
import { UserAvatar } from '@/components/ui/avatar'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { ManagerStat } from '@/types/crm'

interface Props {
  data: ManagerStat[]
  currentUserId?: string
  loading?: boolean
}

const MEDAL = ['🥇', '🥈', '🥉']

export function ManagerRanking({ data, currentUserId, loading }: Props) {
  const t = useT()

  const ranked = [...data].sort((a, b) => b.wonRate - a.wonRate)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <Trophy className="w-4 h-4 text-warning-500 shrink-0" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('dashboard.widget.ranking')}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-gray-50 dark:divide-gray-700/50">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-9 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : ranked.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
            {t('dashboard.widget.noManagers')}
          </p>
        ) : (
          ranked.map((m, i) => {
            const isMe = m.userId === currentUserId
            return (
              <div
                key={m.userId}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 transition-colors',
                  isMe && 'bg-primary-50/60 dark:bg-primary-900/20'
                )}
              >
                <span className="text-base w-6 text-center shrink-0 leading-none">
                  {MEDAL[i] ?? <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                </span>
                <UserAvatar name={m.userName} src={m.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm truncate',
                    isMe ? 'font-semibold text-primary-700 dark:text-primary-300' : 'text-gray-800 dark:text-gray-200'
                  )}>
                    {m.userName}
                    {isMe && <span className="ml-1 text-xs text-primary-500">(вы)</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    {Math.round(m.wonRate * 100)}%
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{m.leadsWon} won</p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
