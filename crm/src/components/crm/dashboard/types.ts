import type { AnalyticsPeriod, Funnel, User } from '@/types/crm'

/** Filters passed into every expandable chart (both main card and modal) */
export interface ChartFilters {
  period: AnalyticsPeriod
  funnelId?: string
  managerId?: string
}

/** Context passed to ChartCard when director is viewing */
export interface ChartDirectorContext {
  isDirector: true
  funnels: Funnel[]
  managers: User[]
}
