'use client'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api/crm/analytics'
import { crmKeys } from '@/lib/api/crm/query-keys'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import type { AnalyticsPeriod } from '@/types/crm'

const STALE = 5 * 60_000 // 5 min

export function useAnalyticsOverview(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: crmKeys.analytics.overview(period),
    queryFn:  () => analyticsApi.overview(period),
    staleTime: STALE,
  })
}

export function useAnalyticsSources(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: crmKeys.analytics.sources(period),
    queryFn:  () => analyticsApi.sources(period),
    staleTime: STALE,
  })
}

export function useAnalyticsManagers(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: crmKeys.analytics.managers(period),
    queryFn:  () => analyticsApi.managers(period),
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

export function useAnalyticsLossReasons(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: crmKeys.analytics.lossReasons(period),
    queryFn:  () => analyticsApi.lossReasons(period),
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
