'use client'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PeriodPicker } from '@/components/crm/analytics/PeriodPicker'
import { OverviewCards } from '@/components/crm/analytics/OverviewCards'
import { LeadsBySourceChart } from '@/components/crm/analytics/LeadsBySourceChart'
import { FunnelConversionChart } from '@/components/crm/analytics/FunnelConversionChart'
import { LossReasonsChart } from '@/components/crm/analytics/LossReasonsChart'
import { ManagerStatsTable } from '@/components/crm/analytics/ManagerStatsTable'
import { SankeyChart } from '@/components/crm/analytics/SankeyChart'
import {
  useAnalyticsOverview,
  useAnalyticsSources,
  useAnalyticsManagers,
  useAnalyticsConversion,
  useAnalyticsLossReasons,
  useAnalyticsSankey,
} from '@/lib/hooks/crm/useAnalytics'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { useFunnels } from '@/lib/hooks/crm/useFunnels'
import { useT } from '@/lib/i18n'
import { useQueryClient } from '@tanstack/react-query'

export default function AnalyticsPage() {
  const period         = useCrmStore((s) => s.analyticsPeriod)
  const setPeriod      = useCrmStore((s) => s.setAnalyticsPeriod)
  const activeFunnelId = useCrmStore((s) => s.activeFunnelId)
  const setFunnelId    = useCrmStore((s) => s.setActiveFunnelId)
  const qc             = useQueryClient()

  const { data: funnels = [] }          = useFunnels()
  const activeFunnels                    = funnels.filter((f) => !f.isArchived)
  const currentFunnelId                  = activeFunnelId || activeFunnels[0]?.id || ''

  const { data: overview,    isLoading: l1 } = useAnalyticsOverview(period)
  const { data: sources = [], isLoading: l2 } = useAnalyticsSources(period)
  const { data: managers = [], isLoading: l4 } = useAnalyticsManagers(period)
  const { data: conversion = [], isLoading: l3 } = useAnalyticsConversion(currentFunnelId, period)
  const { data: lossReasons = [], isLoading: l5 } = useAnalyticsLossReasons(period)
  const { data: sankeyData,  isLoading: l6 } = useAnalyticsSankey(period, currentFunnelId)
  const t = useT()

  const refreshAll = () =>
    qc.invalidateQueries({ queryKey: ['crm', 'analytics'] })

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Funnel selector */}
          {activeFunnels.length > 1 && (
            <select
              value={currentFunnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            >
              {activeFunnels.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}

          <PeriodPicker value={period} onChange={setPeriod} />

          <Button
            variant="secondary"
            size="sm"
            onClick={refreshAll}
            aria-label={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview cards */}
      {overview || l1 ? (
        <OverviewCards data={overview!} isLoading={l1} />
      ) : null}

      {/* Charts row 1: Sources + Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LeadsBySourceChart data={sources} isLoading={l2} />
        <FunnelConversionChart data={conversion} isLoading={l3} />
      </div>

      {/* Charts row 2: Loss reasons + extra metric */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LossReasonsChart data={lossReasons} isLoading={l5} />
        <QuickMetrics period={period} />
      </div>

      {/* Sankey: Source → Stage → Outcome */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('analytics.sankey.title')}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t('analytics.sankey.hint')}
            </p>
          </div>
        </div>
        <SankeyChart data={sankeyData ?? { nodes: [], links: [] }} isLoading={l6} />
      </div>

      {/* Managers table */}
      <ManagerStatsTable data={managers} isLoading={l4} />
    </div>
  )
}

// ── Quick metrics (time-to-close + touches) ──────────────────────────────────
import { Clock, Handshake } from 'lucide-react'
import { useAnalyticsOverview as _unused } from '@/lib/hooks/crm/useAnalytics'
import { analyticsApi } from '@/lib/api/crm/analytics'
import { useQuery } from '@tanstack/react-query'
import { crmKeys } from '@/lib/api/crm/query-keys'
import type { AnalyticsPeriod } from '@/types/crm'

function QuickMetrics({ period }: { period: AnalyticsPeriod }) {
  const t = useT()
  const { data: close } = useQuery({
    queryKey:  ['crm', 'analytics', 'time-to-close', period],
    queryFn:   () => analyticsApi.timeToClose(period),
    staleTime: 5 * 60_000,
  })
  const { data: touches } = useQuery({
    queryKey:  ['crm', 'analytics', 'touches-to-close', period],
    queryFn:   () => analyticsApi.touchesToClose(period),
    staleTime: 5 * 60_000,
  })

  const metrics = [
    {
      label: t('analytics.timeToClose'),
      value: close ? `${close.avgDays.toFixed(1)} ${t('analytics.kpi.responseUnit')}н.` : '—',
      delta: close?.delta ?? null,
      icon: Clock,
      hint: t('analytics.timeToClose.hint'),
    },
    {
      label: t('analytics.touchesToClose'),
      value: touches ? `${touches.avgTouches.toFixed(1)}` : '—',
      delta: touches?.delta ?? null,
      icon: Handshake,
      hint: t('analytics.touchesToClose.hint'),
    },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('analytics.efficiency')}</h3>
      <div className="grid grid-cols-2 gap-4 h-full">
        {metrics.map(({ label, value, delta, icon: Icon, hint }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center text-center bg-gray-50 rounded-xl p-5 gap-2"
            title={hint}
          >
            <Icon className="w-6 h-6 text-primary-400" />
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
            {delta !== null && (
              <span className={`text-xs font-medium ${delta < 0 ? 'text-success-600' : 'text-danger-500'}`}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} {t('analytics.prevPeriod')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
