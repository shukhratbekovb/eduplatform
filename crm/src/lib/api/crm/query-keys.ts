import type { LeadsFilters, TasksFilters, AnalyticsPeriod } from '@/types/crm'

export const crmKeys = {
  funnels:      ()         => ['crm', 'funnels'] as const,
  funnel:       (id: string) => ['crm', 'funnels', id] as const,
  stages:       (funnelId: string) => ['crm', 'funnels', funnelId, 'stages'] as const,
  customFields: (funnelId: string) => ['crm', 'funnels', funnelId, 'custom-fields'] as const,
  sources:      ()         => ['crm', 'sources'] as const,

  leads: (params: Partial<LeadsFilters> & { funnelId?: string; page?: number }) =>
    ['crm', 'leads', JSON.stringify(params)] as const,
  lead:  (id: string) => ['crm', 'leads', 'detail', id] as const,

  timeline: (leadId: string, page?: number) =>
    ['crm', 'leads', 'detail', leadId, 'timeline', page] as const,

  tasks: (params: Partial<TasksFilters> & { all?: boolean }) =>
    ['crm', 'tasks', JSON.stringify(params)] as const,
  task:  (id: string) => ['crm', 'tasks', 'detail', id] as const,

  managers:      () => ['crm', 'managers'] as const,

  notifications: () => ['crm', 'notifications'] as const,

  analytics: {
    overview:    (p: AnalyticsPeriod) => ['crm', 'analytics', 'overview',    p] as const,
    sources:     (p: AnalyticsPeriod) => ['crm', 'analytics', 'sources',     p] as const,
    managers:    (p: AnalyticsPeriod) => ['crm', 'analytics', 'managers',    p] as const,
    conversion:  (funnelId: string, p: AnalyticsPeriod) =>
      ['crm', 'analytics', 'conversion', funnelId, p] as const,
    lossReasons: (p: AnalyticsPeriod) => ['crm', 'analytics', 'loss-reasons', p] as const,
    forecast:    (funnelId: string)    => ['crm', 'analytics', 'forecast',    funnelId] as const,
  },
} as const
