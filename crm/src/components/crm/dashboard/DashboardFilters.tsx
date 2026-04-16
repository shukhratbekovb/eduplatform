'use client'
import { PeriodPicker } from '@/components/crm/analytics/PeriodPicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useT } from '@/lib/i18n'
import type { AnalyticsPeriod } from '@/types/crm'
import type { Funnel, User } from '@/types/crm'

interface Props {
  period: AnalyticsPeriod
  onPeriodChange: (p: AnalyticsPeriod) => void
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
        <Select value={funnelId ?? '__all__'} onValueChange={(v) => onFunnelChange?.(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder={t('dashboard.filter.allFunnels')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('dashboard.filter.allFunnels')}</SelectItem>
            {funnels.filter((f) => !f.isArchived).map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {isDirector && managers && managers.length > 0 && (
        <Select value={managerId ?? '__all__'} onValueChange={(v) => onManagerChange?.(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder={t('dashboard.filter.allManagers')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('dashboard.filter.allManagers')}</SelectItem>
            {managers.filter((m) => m.role === 'sales_manager').map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
