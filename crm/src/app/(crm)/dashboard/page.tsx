'use client'
import { useState } from 'react'
import {
  Users, CheckSquare, CheckCheck, AlertTriangle, TrendingUp,
  RefreshCw, FileText,
} from 'lucide-react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'

import { useIsDirector, useCurrentUser } from '@/lib/stores/useAuthStore'
import { useT } from '@/lib/i18n'

import {
  useAnalyticsOverview,
  useAnalyticsManagers,
} from '@/lib/hooks/crm/useAnalytics'
import { useTasks }   from '@/lib/hooks/crm/useTasks'
import { useFunnels } from '@/lib/hooks/crm/useFunnels'
import { useManagers } from '@/lib/hooks/crm/useLeads'
import type { User, AnalyticsPeriod } from '@/types/crm'

import { KpiCard }         from '@/components/crm/dashboard/KpiCard'
import { ChartCard }       from '@/components/crm/dashboard/ChartCard'
import { DashboardFilters } from '@/components/crm/dashboard/DashboardFilters'
import { ManagersTable }   from '@/components/crm/dashboard/ManagersTable'
import { TodayTasksList }  from '@/components/crm/dashboard/TodayTasksList'
import { OverdueTasksList } from '@/components/crm/dashboard/OverdueTasksList'
import { ManagerRanking }  from '@/components/crm/dashboard/ManagerRanking'
import {
  LeadsOverTimeContainer,
  SourcesChartContainer,
  FunnelConvContainer,
} from '@/components/crm/dashboard/chartContainers'
import type { ChartFilters } from '@/components/crm/dashboard/types'

export default function DashboardPage() {
  const t          = useT()
  const isDirector = useIsDirector()
  const user       = useCurrentUser()
  const qc         = useQueryClient()

  // Page-level filters (for KPI cards, tasks, ranking)
  const [period,    setPeriod]    = useState<AnalyticsPeriod>({ type: 'month' })
  const [funnelId,  setFunnelId]  = useState<string>('')
  const [managerId, setManagerId] = useState<string>('')

  // Dashboard filters object passed into ChartCard as baseline
  const dashboardFilters: ChartFilters = {
    period,
    funnelId:  funnelId  || undefined,
    managerId: managerId || undefined,
  }

  // Reference data
  const { data: funnels  = [] } = useFunnels()
  const { data: managers = [] } = useManagers()

  // Analytics filters (period + funnel + manager)
  const analyticsFilters = {
    period,
    funnelId:  funnelId  || undefined,
    managerId: managerId || undefined,
  }

  // KPI data
  const { data: overview,     isLoading: l1 } = useAnalyticsOverview(analyticsFilters)
  const { data: managerStats = [], isLoading: l3 } = useAnalyticsManagers(analyticsFilters)
  const { data: tasks = [],   isLoading: tasksLoading } = useTasks()
  const { data: contractsOverview } = useQuery({
    queryKey: ['crm', 'analytics', 'contracts-overview', period],
    queryFn: () => apiClient.get('/crm/analytics/contracts-overview', { params: { period: period.type } }).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['crm', 'analytics'] })
    qc.invalidateQueries({ queryKey: ['crm', 'tasks'] })
  }

  const visibleTasks = isDirector
    ? (managerId ? tasks.filter((tk) => tk.assignedTo === managerId) : tasks)
    : tasks.filter((tk) => tk.assignedTo === user?.id)

  const conversionRate = managerStats.length > 0
    ? Math.round(managerStats.reduce((s, m) => s + m.wonRate, 0) / managerStats.length * 100)
    : 0

  const myStats = managerStats.find((m) => m.userId === user?.id)

  // Director context forwarded to ChartCard for in-modal filters
  const directorCtx = isDirector ? { funnels, managers } : undefined

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isDirector
              ? t('dashboard.welcomeDirector')
              : `${t('dashboard.welcomeManager')}, ${user?.name?.split(' ')[0]}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DashboardFilters
            period={period}
            onPeriodChange={setPeriod}
            isDirector={isDirector}
            funnels={funnels}
            funnelId={funnelId}
            onFunnelChange={setFunnelId}
            managers={managers}
            managerId={managerId}
            onManagerChange={setManagerId}
          />
          <button
            onClick={handleRefresh}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      {isDirector ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <KpiCard label={t('dashboard.kpi.newLeads')}       value={overview?.newLeads ?? 0}       delta={overview?.delta.newLeads}        icon={Users}       color="primary" loading={l1} href="/leads" />
          <KpiCard label={t('dashboard.kpi.totalTasks')}     value={overview?.totalTasks ?? 0}                                              icon={CheckSquare} color="info"    loading={l1} href="/tasks" />
          <KpiCard label={t('dashboard.kpi.completedTasks')} value={overview?.completedTasks ?? 0} delta={overview?.completedTasksPercent} icon={CheckCheck}  color="success" loading={l1} href="/tasks" />
          <KpiCard label={t('dashboard.kpi.overdueTasks')}   value={overview?.overdueTasks ?? 0}                                           icon={AlertTriangle} color="danger" loading={l1} href="/tasks" />
          <KpiCard label={t('dashboard.kpi.conversionRate')} value={conversionRate}                 suffix="%"                             icon={TrendingUp}  color="warning" loading={l3} href="/analytics" />
          <KpiCard label={t("contracts.title")}                          value={contractsOverview?.totalContracts ?? 0}                                icon={FileText}    color="info"    loading={false} href="/contracts" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label={t('dashboard.kpi.myLeads')}      value={myStats?.leadsHandled ?? 0}                                icon={Users}       color="primary" loading={l3}         href="/leads" />
          <KpiCard label={t('dashboard.kpi.myTasks')}      value={visibleTasks.filter((t) => t.status !== 'done').length}    icon={CheckSquare} color="info"    loading={tasksLoading} href="/tasks" />
          <KpiCard label={t('dashboard.kpi.myDone')}       value={visibleTasks.filter((t) => t.status === 'done').length}    icon={CheckCheck}  color="success" loading={tasksLoading} href="/tasks" />
          <KpiCard label={t('dashboard.kpi.myConversion')} value={myStats ? Math.round(myStats.wonRate * 100) : 0} suffix="%" icon={TrendingUp}  color="warning" loading={l3}         href="/analytics" />
        </div>
      )}

      {/* ── Charts Row 1 ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/*
          Leads Over Time — period + funnel + manager filterable in modal
        */}
        <ChartCard
          title={t('dashboard.chart.leadsOverTime')}
          dashboardFilters={dashboardFilters}
          directorCtx={directorCtx}
          modalFilters={isDirector ? ['period', 'funnel', 'manager'] : ['period']}
        >
          {(filters) => <LeadsOverTimeContainer {...filters} />}
        </ChartCard>

        {/*
          Leads by Source — period filterable in modal
        */}
        <ChartCard
          title={t('dashboard.chart.leadsBySource')}
          dashboardFilters={dashboardFilters}
          modalFilters={['period']}
        >
          {(filters) => <SourcesChartContainer {...filters} />}
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ────────────────────────────────────────────────── */}
      {isDirector ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/*
            Funnel Conversion — period + funnel filterable in modal
          */}
          <ChartCard
            title={t('dashboard.chart.funnelConversion')}
            dashboardFilters={dashboardFilters}
            directorCtx={directorCtx}
            modalFilters={['period', 'funnel']}
          >
            {(filters) => <FunnelConvContainer {...filters} />}
          </ChartCard>

          {/* Managers table (static within page filters, no modal) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('dashboard.widget.managersTable')}
              </h3>
            </div>
            <div className="flex-1 p-4">
              <ManagersTable data={managerStats} loading={l3} />
            </div>
          </div>
        </div>
      ) : (
        <ChartCard
          title={t('dashboard.chart.funnelConversion')}
          dashboardFilters={dashboardFilters}
          modalFilters={['period']}
        >
          {(filters) => <FunnelConvContainer {...filters} />}
        </ChartCard>
      )}

      {/* ── Bottom Row: Tasks + Ranking ──────────────────────────────────── */}
      <div className={`grid gap-4 ${isDirector ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
        <TodayTasksList  tasks={visibleTasks} loading={tasksLoading} />
        <OverdueTasksList tasks={visibleTasks} loading={tasksLoading} />
        <ManagerRanking  data={managerStats} currentUserId={user?.id} loading={l3} />
      </div>
    </div>
  )
}
