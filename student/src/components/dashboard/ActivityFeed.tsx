'use client'
import { Star, Gem, BookCheck, UserCheck, MessageSquare, Trophy } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { formatShortDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { ActivityEvent, ActivityEventType } from '@/types/student'

interface Props { events: ActivityEvent[]; isLoading?: boolean }

const icons: Record<ActivityEventType, React.ElementType> = {
  stars_earned:    Star,
  crystals_earned: Gem,
  homework_graded: BookCheck,
  attendance:      UserCheck,
  teacher_reply:   MessageSquare,
  badge_unlocked:  Trophy,
}

const iconColors: Record<ActivityEventType, string> = {
  stars_earned:    'text-warning-500 bg-warning-50',
  crystals_earned: 'text-info-500 bg-info-50',
  homework_graded: 'text-primary-500 bg-primary-50',
  attendance:      'text-success-600 bg-success-50',
  teacher_reply:   'text-gray-500 bg-gray-100',
  badge_unlocked:  'text-warning-600 bg-warning-50',
}

export function ActivityFeed({ events, isLoading }: Props) {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)

  // Group by date
  const byDate: Record<string, ActivityEvent[]> = {}
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = []
    byDate[ev.date].push(ev)
  }
  const dates = Object.keys(byDate).sort().reverse()

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('dashboard.activity')}</h3>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-7 h-7 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('dashboard.noActivity')}</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {dates.map((date) => (
            <div key={date}>
              <p className="text-xs font-medium text-gray-400 mb-2 capitalize">{formatShortDate(date, lang)}</p>
              <div className="space-y-2">
                {byDate[date].map((ev) => {
                  const Icon = icons[ev.type]
                  const colorClass = iconColors[ev.type]
                  return (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', colorClass)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 leading-snug line-clamp-2">{ev.description}</p>
                        {(ev.starsAmount || ev.crystalsAmount) && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {ev.starsAmount && (
                              <span className="text-xs font-semibold text-warning-600 flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-warning-500 text-warning-500" />+{ev.starsAmount}
                              </span>
                            )}
                            {ev.crystalsAmount && (
                              <span className="text-xs font-semibold text-info-600 flex items-center gap-0.5">
                                <Gem className="w-3 h-3" />+{ev.crystalsAmount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
