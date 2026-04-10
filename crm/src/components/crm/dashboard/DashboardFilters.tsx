'use client'
import { PeriodPicker } from '@/components/crm/analytics/PeriodPicker'
import { useT } from '@/lib/i18n'
import type { AnalyticsPeriod } from '@/types/crm'
import type { Funnel, User } from '@/types/crm'

interface Props {
  period: AnalyticsPeriod
  onPeriodChange: (p: AnalyticsPeriod) => void

  // Director-only filters
  isDirector?: boolean
  funnels?: Funnel[]
  funnelId?: string
  onFunnelChange?: (id: string) => void
  managers?: User[]
  managerId?: string
  onManagerChange?: (id: string) => void
}

export function DashboardFilters({
  period, onPeriodChange,
  isDirector, funnels, funnelId, onFunnelChange,
  managers, managerId, onManagerChange,
}: Props) {
  const t = useT()

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <PeriodPicker value={period} onChange={onPeriodChange} />

      {isDirector && funnels && funnels.length > 0 && (
        <select
          value={funnelId ?? ''}
          onChange={(e) => onFunnelChange?.(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('dashboard.filter.allFunnels')}</option>
          {funnels.filter((f) => !f.isArchived).map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      {isDirector && managers && managers.length > 0 && (
        <select
          value={managerId ?? ''}
          onChange={(e) => onManagerChange?.(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('dashboard.filter.allManagers')}</option>
          {managers.filter((m) => m.role === 'sales_manager').map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}
