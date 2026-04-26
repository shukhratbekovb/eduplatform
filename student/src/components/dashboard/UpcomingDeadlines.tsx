'use client'
import Link from 'next/link'
import { AlertTriangle, Clock, FileText, ChevronRight } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import { differenceInDays, parseISO } from 'date-fns'

interface Props {
  assignments: any[]
  isLoading?: boolean
}

export function UpcomingDeadlines({ assignments, isLoading }: Props) {
  const t = useT()
  const now = new Date()

  const sorted = [...assignments]
    .sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1
      if (b.status === 'overdue' && a.status !== 'overdue') return 1
      return (a.deadline ?? '').localeCompare(b.deadline ?? '')
    })
    .slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning-500" />
          <h3 className="text-sm font-semibold text-gray-700">
            {t('dashboard.upcomingDeadlines')}
          </h3>
        </div>
        <Link href="/homework" className="text-xs text-primary-600 hover:underline">
          {t('common.all')}
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 text-gray-400">
          <FileText className="w-7 h-7 mb-1.5 opacity-30" />
          <p className="text-xs">{t('dashboard.noActiveAssignments')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((a: any) => {
            const isOverdue = a.status === 'overdue'
            const deadlineDate = a.deadline ? parseISO(a.deadline) : null
            const daysLeft = deadlineDate ? differenceInDays(deadlineDate, now) : null
            const isUrgent = daysLeft !== null && daysLeft <= 2 && !isOverdue

            return (
              <Link
                key={a.id}
                href="/homework"
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg border transition-colors group',
                  isOverdue ? 'border-red-200 bg-red-50 hover:bg-red-100' :
                  isUrgent ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' :
                  'border-gray-100 bg-white hover:bg-gray-50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  isOverdue ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-gray-100'
                )}>
                  {isOverdue
                    ? <AlertTriangle className="w-4 h-4 text-red-500" />
                    : <FileText className="w-4 h-4 text-gray-500" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{a.title}</p>
                  <p className={cn('text-[10px] mt-0.5',
                    isOverdue ? 'text-red-500 font-medium' :
                    isUrgent ? 'text-amber-600' : 'text-gray-400'
                  )}>
                    {isOverdue
                      ? t('deadline.overdue')
                      : daysLeft === 0
                      ? t('deadline.today')
                      : daysLeft === 1
                      ? t('deadline.tomorrow')
                      : daysLeft !== null
                      ? t('deadline.daysLeft').replace('{n}', String(daysLeft))
                      : ''}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
