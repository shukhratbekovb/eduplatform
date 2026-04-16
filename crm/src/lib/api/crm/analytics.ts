import { apiClient } from '@/lib/api/axios'
import type {
  AnalyticsOverview, LeadSourceStat, FunnelConversionStat,
  ManagerStat, LossReasonStat, CloseStat, TouchesStat, LeadsOverTimeStat, SankeyData,
} from '@/types/crm'
import type { AnalyticsPeriod } from '@/types/crm/filters'

export interface AnalyticsFilters {
  period: AnalyticsPeriod
  funnelId?: string
  managerId?: string
}

function buildParams(f: AnalyticsFilters) {
  const p = f.period.type === 'custom'
    ? { period: 'custom', from: f.period.from, to: f.period.to }
    : { period: f.period.type }
  return {
    ...p,
    ...(f.funnelId  ? { funnelId: f.funnelId }   : {}),
    ...(f.managerId ? { managerId: f.managerId } : {}),
  }
}

function periodParams(p: AnalyticsPeriod) {
  if (p.type === 'custom') return { period: 'custom', from: p.from, to: p.to }
  return { period: p.type }
}

export const analyticsApi = {
  overview:    (f: AnalyticsFilters) =>
    apiClient.get<AnalyticsOverview>('/crm/analytics/overview', { params: buildParams(f) }).then(r => r.data),
  sources:     (f: AnalyticsFilters) =>
    apiClient.get<LeadSourceStat[]>('/crm/analytics/sources', { params: buildParams(f) }).then(r => r.data),
  managers:    (f: AnalyticsFilters) =>
    apiClient.get<ManagerStat[]>('/crm/analytics/managers', { params: buildParams(f) }).then(r => r.data),
  conversion:  (funnelId: string, p: AnalyticsPeriod) =>
    apiClient.get<FunnelConversionStat[]>('/crm/analytics/funnel-conversion', {
      params: { funnelId, ...periodParams(p) }
    }).then(r => r.data),
  lossReasons: (f: AnalyticsFilters) =>
    apiClient.get<LossReasonStat[]>('/crm/analytics/loss-reasons', { params: buildParams(f) }).then(r => r.data),
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
