'use client'
/**
 * Self-fetching chart containers.
 * Each accepts ChartFilters and fetches its own data — used in both
 * the main ChartCard and the expanded modal (with independent filter state).
 */
import {
  useLeadsOverTime,
  useAnalyticsSources,
  useAnalyticsConversion,
} from '@/lib/hooks/crm/useAnalytics'
import { useFunnels } from '@/lib/hooks/crm/useFunnels'
import { LeadsOverTimeChart }    from './LeadsOverTimeChart'
import { DashLeadsBySourceChart } from './DashLeadsBySourceChart'
import { DashFunnelConvChart }   from './DashFunnelConvChart'
import type { ChartFilters } from './types'

function Spinner() {
  return (
    <div className="h-full min-h-[200px] flex items-center justify-center">
      <div className="animate-spin w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )
}

// ── Leads Over Time ───────────────────────────────────────────────────────────

export function LeadsOverTimeContainer({ period, funnelId, managerId }: ChartFilters) {
  const { data = [], isLoading } = useLeadsOverTime(period, funnelId, managerId)
  if (isLoading) return <Spinner />
  return <LeadsOverTimeChart data={data} />
}

// ── Leads by Source ───────────────────────────────────────────────────────────

export function SourcesChartContainer({ period }: ChartFilters) {
  const { data = [], isLoading } = useAnalyticsSources(period)
  if (isLoading) return <Spinner />
  return <DashLeadsBySourceChart data={data} />
}

// ── Funnel Conversion ─────────────────────────────────────────────────────────

export function FunnelConvContainer({ period, funnelId }: ChartFilters) {
  const { data: funnels = [] } = useFunnels()
  const resolvedFunnelId = funnelId || funnels.find((f) => !f.isArchived)?.id || ''
  const { data = [], isLoading } = useAnalyticsConversion(resolvedFunnelId, period)
  if (isLoading) return <Spinner />
  return <DashFunnelConvChart data={data} />
}
