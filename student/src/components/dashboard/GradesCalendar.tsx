'use client'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { format, parseISO, startOfMonth, getDaysInMonth, getDay } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { Grade } from '@/types/student'

interface Props { grades: Grade[]; isLoading?: boolean }

function gradeColor(value: number) {
  if (value >= 11) return 'bg-primary-600 text-white'
  if (value >= 9)  return 'bg-primary-300 text-white'
  if (value >= 7)  return 'bg-warning-400 text-white'
  return 'bg-danger-400 text-white'
}

export function GradesCalendar({ grades, isLoading }: Props) {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)
  const locale = lang === 'ru' ? ru : enUS

  // Group grades by month → day
  const byDate: Record<string, number[]> = {}
  for (const g of grades) {
    if (!byDate[g.date]) byDate[g.date] = []
    byDate[g.date].push(g.value)
  }

  // Get unique months from grades (up to 2 latest)
  const months = [...new Set(grades.map((g) => g.date.slice(0, 7)))].sort().reverse().slice(0, 2)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{t('dashboard.grades')}</h3>
      </div>

      {isLoading ? (
        <div className="h-32 bg-gray-50 rounded animate-pulse" />
      ) : (
        <div className="space-y-4">
          {months.map((month) => {
            const firstDay = parseISO(`${month}-01`)
            const daysInMonth = getDaysInMonth(firstDay)
            const monthLabel = format(firstDay, 'LLLL yyyy', { locale })

            return (
              <div key={month}>
                <p className="text-xs font-medium text-gray-500 mb-2 capitalize">{monthLabel}</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1
                    const dateStr = `${month}-${String(day).padStart(2, '0')}`
                    const dayGrades = byDate[dateStr]
                    const avg = dayGrades ? Math.round(dayGrades.reduce((a, b) => a + b, 0) / dayGrades.length) : null

                    return (
                      <div
                        key={day}
                        className={cn(
                          'w-6 h-6 rounded text-xs font-medium flex items-center justify-center',
                          avg !== null ? gradeColor(avg) : 'bg-gray-100 text-gray-300'
                        )}
                        title={avg !== null ? `${dateStr}: ${avg}` : dateStr}
                      >
                        {avg ?? day}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
