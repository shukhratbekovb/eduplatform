'use client'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { AttendanceRecord } from '@/types/student'

interface Props {
  data?: { presentPercent: number; absentPercent: number; latePercent: number }
  calendar: AttendanceRecord[]
  isLoading?: boolean
}

const statusColor: Record<string, string> = {
  present: 'bg-primary-500',
  absent:  'bg-danger-400',
  late:    'bg-warning-400',
}

export function AttendanceWidget({ data, calendar, isLoading }: Props) {
  const t = useT()

  // last 30 days calendar — unique dates
  const recent = [...new Map(calendar.map((r) => [r.date, r])).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{t('dashboard.attendance')}</h3>
      <p className="text-xs text-gray-400 mb-3">{t('dashboard.attendance.30d')}</p>

      {isLoading ? (
        <div className="h-20 bg-gray-50 rounded animate-pulse" />
      ) : (
        <>
          {/* Stats row */}
          <div className="flex gap-4 mb-4">
            {[
              { key: 'dashboard.attendance.present', value: data?.presentPercent ?? 0, color: 'text-primary-600' },
              { key: 'dashboard.attendance.absent',  value: data?.absentPercent  ?? 0, color: 'text-danger-500' },
              { key: 'dashboard.attendance.late',    value: data?.latePercent    ?? 0, color: 'text-warning-600' },
            ].map(({ key, value, color }) => (
              <div key={key} className="flex-1 text-center">
                <p className={cn('text-xl font-bold', color)}>{value}%</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {value > 0 ? '+' : ''}{t(key)}
                </p>
              </div>
            ))}
          </div>

          {/* Mini calendar dots */}
          <div className="flex flex-wrap gap-1">
            {recent.map((r) => (
              <div
                key={r.date}
                className={cn('w-4 h-4 rounded-sm', statusColor[r.status] ?? 'bg-gray-100')}
                title={`${r.date}: ${r.status}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
