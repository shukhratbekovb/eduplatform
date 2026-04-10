import { apiClient } from '@/lib/api/axios'
import type {
  AnalyticsOverview, LeadSourceStat, FunnelConversionStat,
  ManagerStat, LossReasonStat, CloseStat, TouchesStat, LeadsOverTimeStat, SankeyData,
} from '@/types/crm'
import type { AnalyticsPeriod } from '@/types/crm/filters'

function periodParams(p: AnalyticsPeriod) {
  if (p.type === 'custom') return { period: 'custom', from: p.from, to: p.to }
  return { period: p.type }
}

export const analyticsApi = {
  overview:    (p: AnalyticsPeriod) =>
    apiClient.get<AnalyticsOverview>('/crm/analytics/overview', { params: periodParams(p) }).then(r => r.data),
  sources:     (p: AnalyticsPeriod) =>
    apiClient.get<LeadSourceStat[]>('/crm/analytics/sources', { params: periodParams(p) }).then(r => r.data),
  managers:    (p: AnalyticsPeriod) =>
    apiClient.get<ManagerStat[]>('/crm/analytics/managers', { params: periodParams(p) }).then(r => r.data),
  conversion:  (funnelId: string, p: AnalyticsPeriod) =>
    apiClient.get<FunnelConversionStat[]>('/crm/analytics/funnel-conversion', {
      params: { funnelId, ...periodParams(p) }
    }).then(r => r.data),
  lossReasons: (p: AnalyticsPeriod) =>
    apiClient.get<LossReasonStat[]>('/crm/analytics/loss-reasons', { params: periodParams(p) }).then(r => r.data),
  forecast:    (funnelId: string) =>
    apiClient.get<{ forecast: number }>('/crm/analytics/forecast', { params: { funnelId } }).then(r => r.data),
  timeToClose:     (p: AnalyticsPeriod) =>
    apiClient.get<CloseStat>('/crm/analytics/time-to-close', { params: periodParams(p) }).then(r => r.data),
  touchesToClose:  (p: AnalyticsPeriod) =>
    apiClient.get<TouchesStat>('/crm/analytics/touches-to-close', { params: periodParams(p) }).then(r => r.data),
  leadsOverTime: (p: AnalyticsPeriod, funnelId?: string, managerId?: string) =>
    apiClient.get<LeadsOverTimeStat[]>('/crm/analytics/leads-over-time', {
      params: { ...periodParams(p), ...(funnelId ? { funnelId } : {}), ...(managerId ? { managerId } : {}) }
    }).then(r => r.data),
  sankey: (p: AnalyticsPeriod, funnelId?: string) =>
    apiClient.get<SankeyData>('/crm/analytics/sankey', {
      params: { ...periodParams(p), ...(funnelId ? { funnelId } : {}) }
    }).then(r => r.data),
}
