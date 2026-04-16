'use client'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api/crm/analytics'
import type { AnalyticsFilters } from '@/lib/api/crm/analytics'
import { crmKeys } from '@/lib/api/crm/query-keys'
import type { AnalyticsPeriod } from '@/types/crm'

const STALE = 5 * 60_000 // 5 min

export function useAnalyticsOverview(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'overview', filters],
    queryFn:  () => analyticsApi.overview(filters),
    staleTime: STALE,
  })
}

export function useAnalyticsSources(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'sources', filters],
    queryFn:  () => analyticsApi.sources(filters),
    staleTime: STALE,
  })
}

export function useAnalyticsManagers(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'managers', filters],
    queryFn:  () => analyticsApi.managers(filters),
    staleTime: STALE,
  })
}

export function useAnalyticsConversion(funnelId: string, period: AnalyticsPeriod) {
  return useQuery({
    queryKey: crmKeys.analytics.conversion(funnelId, period),
    queryFn:  () => analyticsApi.conversion(funnelId, period),
    enabled:  !!funnelId,
    staleTime: STALE,
  })
}

export function useAnalyticsLossReasons(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'loss-reasons', filters],
    queryFn:  () => analyticsApi.lossReasons(filters),
    staleTime: STALE,
  })
}

export function useLeadsOverTime(
  period: AnalyticsPeriod,
  funnelId?: string,
  managerId?: string,
) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'leads-over-time', period, funnelId, managerId],
    queryFn:  () => analyticsApi.leadsOverTime(period, funnelId, managerId),
    staleTime: STALE,
  })
}

export function useAnalyticsSankey(period: AnalyticsPeriod, funnelId?: string) {
  return useQuery({
    queryKey: ['crm', 'analytics', 'sankey', period, funnelId],
    queryFn:  () => analyticsApi.sankey(period, funnelId),
    staleTime: STALE,
  })
}
