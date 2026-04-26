'use client'

/**
 * Страница аналитики LMS с графиками и KPI-карточками.
 *
 * Разделы:
 * - KPI-карточки: студенты, уроки, посещаемость, риск
 * - Графики: посещаемость по дням (Line), оценки по предметам (Bar),
 *   распределение риска (Pie), эффективность преподавателей (таблица)
 * - Финансовый блок (только директор/кассир): доход по месяцам,
 *   доход по направлениям, таблица должников
 *
 * Все графики построены на библиотеке Recharts.
 * Период фильтруется: сегодня / неделя / месяц.
 *
 * @module AnalyticsPage
 */

import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { BarChart3, Users, BookOpen, TrendingUp, AlertTriangle, Banknote, Wallet, CircleDollarSign } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import {
  useAnalyticsOverview,
  useAnalyticsAttendance,
  useAnalyticsGrades,
  useAnalyticsRisk,
  useAnalyticsTeachers,
} from '@/lib/hooks/lms/useAnalytics'
import { useIsDirector, useIsCashier } from '@/lib/stores/useAuthStore'
import type { AnalyticsPeriod } from '@/types/lms'
import { cn } from '@/lib/utils/cn'

function usePeriods() {
  const t = useT()
  return [
    { value: 'today' as AnalyticsPeriod, label: t('common.today') },
    { value: 'week' as AnalyticsPeriod,  label: t('analytics.week') },
    { value: 'month' as AnalyticsPeriod, label: t('analytics.month') },
  ]
}

const RISK_COLORS: Record<string, string> = {
  normal:   '#22c55e',
  at_risk:  '#f59e0b',
  critical: '#ef4444',
}

function fmt(n: number) { return n.toLocaleString('ru-RU') + ' UZS' }

function useShortMonthNames() {
  const t = useT()
  return Array.from({ length: 12 }, (_, i) => t(`monthShort.${i}`))
}

const DIRECTION_COLORS = ['#4F46E5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1']

/**
 * Основной компонент страницы аналитики.
 * Загружает данные из нескольких API и рендерит графики и таблицы.
 */
export default function AnalyticsPage() {
  const t = useT()
  const PERIODS = usePeriods()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const filters = { period }

  const isDirector = useIsDirector()
  const isCashier = useIsCashier()
  const showFinance = isDirector || isCashier

  const { data: overview }   = useAnalyticsOverview(filters)
  const { data: attendance }  = useAnalyticsAttendance(filters)
  const { data: grades }      = useAnalyticsGrades(filters)
  const { data: risk }        = useAnalyticsRisk(filters)
  const { data: teachers }    = useAnalyticsTeachers(filters)

  const shortMonthNames = useShortMonthNames()

  const now = new Date()
  const { data: finStats } = useQuery({
    queryKey: ['analytics', 'finance-stats'],
    queryFn: () => apiClient.get('/lms/reports/finance/dashboard-stats').then((r) => r.data as any),
    enabled: showFinance,
  })
  const { data: incomeData } = useQuery({
    queryKey: ['analytics', 'finance-income', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => apiClient.get('/lms/reports/finance/income', { params: { month: now.getMonth() + 1, year: now.getFullYear() } }).then((r) => r.data as any),
    enabled: showFinance,
  })
  const { data: debtors } = useQuery({
    queryKey: ['analytics', 'finance-debtors'],
    queryFn: () => apiClient.get('/lms/reports/finance/debtors').then((r) => r.data as any[]),
    enabled: showFinance,
  })

  const attendanceData = Array.isArray(attendance) ? attendance : []
  const gradesData     = Array.isArray(grades) ? grades : []
  // Преобразование объекта риска {normal: N, at_risk: N, critical: N} в массив для PieChart
  const riskObj        = (risk as any) ?? {}
  const riskData       = Object.keys(riskObj).length > 0
    ? [
        { level: 'normal',   count: riskObj.normal   ?? 0, label: t('analytics.normal') },
        { level: 'at_risk',  count: riskObj.at_risk  ?? 0, label: t('analytics.risk') },
        { level: 'critical', count: riskObj.critical ?? 0, label: t('analytics.critical') },
      ].filter((r) => r.count > 0)
    : []
  const teacherData    = Array.isArray(teachers) ? teachers : []

  const ov = overview as any

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          {t('analytics.title')}
        </h1>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                period === p.value
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Users}         label={t('analytics.totalStudents')}      value={String(ov?.totalStudents ?? '—')}        color="text-primary-600" bg="bg-primary-50" />
        <KpiCard icon={BookOpen}      label={t('analytics.lessonsWeek')}     value={String(ov?.lessonsThisWeek ?? '—')}      color="text-success-600" bg="bg-success-50" />
        <KpiCard icon={TrendingUp}    label={t('analytics.avgAttendance')} value={ov?.avgAttendance != null ? `${ov.avgAttendance}%` : '—'} color="text-info-600" bg="bg-info-50" />
        <KpiCard icon={AlertTriangle} label={t('analytics.atRisk')}         value={String(ov?.atRiskStudents ?? '—')}       color="text-warning-600" bg="bg-warning-50" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title={t('analytics.attendanceChart')}>
          {attendanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v}%`, t('analytics.attendanceChart')]} />
                <Line type="monotone" dataKey="attendanceRate" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title={t('analytics.gradesBySubject')}>
          {gradesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gradesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis type="category" dataKey="subjectName" tick={{ fontSize: 11 }} tickLine={false} width={90} />
                <Tooltip formatter={(v: any) => [(v as number).toFixed(1), t('analytics.avgGrade')]} />
                <Bar dataKey="avgGrade" fill="#4F46E5" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('analytics.riskDistribution')}>
          {riskData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={riskData} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
                    {riskData.map((entry: any) => (
                      <Cell key={entry.level} fill={RISK_COLORS[entry.level] ?? '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, _: any, p: any) => [v, p.payload.label]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {riskData.map((entry: any) => (
                  <div key={entry.level} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: RISK_COLORS[entry.level] ?? '#9ca3af' }} />
                    <span className="text-xs text-gray-600">{entry.label}</span>
                    <span className="text-xs font-semibold text-gray-900 ml-auto">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title={t('analytics.teacherEfficiency')}>
          {teacherData.length > 0 ? (
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">{t('analytics.teacher')}</th>
                    <th className="text-right pb-2 font-medium">{t('analytics.planned')}</th>
                    <th className="text-right pb-2 font-medium">{t('analytics.conducted')}</th>
                    <th className="text-right pb-2 font-medium">{t('analytics.completionPct')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teacherData.map((t: any) => (
                    <tr key={t.teacherId}>
                      <td className="py-2 text-gray-900">{t.teacherName}</td>
                      <td className="py-2 text-right text-gray-600">{t.lessonsScheduled}</td>
                      <td className="py-2 text-right text-gray-600">{t.lessonsConducted}</td>
                      <td className={cn(
                        'py-2 text-right font-semibold',
                        t.conductRate >= 90 ? 'text-success-600' : t.conductRate >= 70 ? 'text-gray-700' : 'text-danger-600'
                      )}>
                        {t.conductRate?.toFixed(1) ?? '—'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Financial analytics — director / cashier only */}
      {showFinance && finStats && (
        <>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-8 mb-3">{t('dash.finance')}</h2>

          {/* Finance KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <KpiCard icon={Banknote}         label={t('dash.incomeMonth')}      value={fmt(finStats.incomeMonth)}    color="text-success-600" bg="bg-success-50" />
            <KpiCard icon={CircleDollarSign} label={t('dash.expectedMonth')}   value={fmt(finStats.expectedMonth)}  color="text-blue-600"    bg="bg-blue-50" />
            <KpiCard icon={AlertTriangle}    label={t('dash.debtors')}         value={String(finStats.debtorCount)} color="text-danger-600"  bg="bg-danger-50" />
            <KpiCard icon={Wallet}           label={t('dash.overdueDebt')}     value={fmt(finStats.overdueTotal)}   color="text-warning-600" bg="bg-warning-50" />
          </div>

          {/* Finance charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t('analytics.incomeByMonth')}>
              {incomeData?.monthlyTrend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={incomeData.monthlyTrend.map((tr: any) => ({ ...tr, name: shortMonthNames[tr.month - 1] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                    <Tooltip formatter={(v: any) => [fmt(v), t('analytics.incomeLabel')]} />
                    <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart />}
            </ChartCard>

            <ChartCard title={t('analytics.incomeByDirection')}>
              {incomeData?.byDirection?.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={incomeData.byDirection.map((d: any, i: number) => ({ ...d, fill: DIRECTION_COLORS[i % DIRECTION_COLORS.length] }))}
                        dataKey="amount" nameKey="directionName" cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      >
                        {incomeData.byDirection.map((_: any, i: number) => (
                          <Cell key={i} fill={DIRECTION_COLORS[i % DIRECTION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any) => [fmt(v), t('analytics.incomeLabel')]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {incomeData.byDirection.map((d: any, i: number) => (
                      <div key={d.directionName} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: DIRECTION_COLORS[i % DIRECTION_COLORS.length] }} />
                        <span className="text-xs text-gray-600 truncate flex-1">{d.directionName}</span>
                        <span className="text-xs font-semibold text-gray-900 ml-auto whitespace-nowrap">{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <EmptyChart />}
            </ChartCard>
          </div>

          {/* Debtors table */}
          {debtors && debtors.length > 0 && (
            <div className="mt-4">
              <ChartCard title={`${t('analytics.debtors')} (${debtors.length})`}>
                <div className="overflow-auto max-h-[220px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">{t('students.student')}</th>
                        <th className="text-left pb-2 font-medium">{t('analytics.direction')}</th>
                        <th className="text-right pb-2 font-medium">{t('analytics.debt')}</th>
                        <th className="text-center pb-2 font-medium">{t('analytics.overdue')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {debtors.slice(0, 10).map((d: any) => (
                        <tr key={d.studentId}>
                          <td className="py-2">
                            <p className="text-gray-900">{d.fullName}</p>
                            <p className="text-[10px] text-gray-400">{d.studentCode}</p>
                          </td>
                          <td className="py-2 text-xs text-gray-600">{d.contracts.map((c: any) => c.directionName).join(', ')}</td>
                          <td className="py-2 text-right font-semibold text-red-600">{fmt(d.totalDebt)}</td>
                          <td className="py-2 text-center">
                            {d.overdueCount > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700">{d.overdueCount}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Карточка ключевого показателя эффективности (KPI).
 *
 * @param icon - иконка Lucide
 * @param label - подпись показателя
 * @param value - значение (строка)
 * @param color - CSS-класс цвета иконки
 * @param bg - CSS-класс цвета фона иконки
 */
function KpiCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: string; color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center mb-3', bg)}>
        <Icon className={cn('w-4 h-4', color)} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

/** Обёртка-карточка для графика с заголовком */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

/** Заглушка для графика при отсутствии данных за выбранный период */
function EmptyChart() {
  const t = useT()
  return (
    <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">
      {t('analytics.noDataPeriod')}
    </div>
  )
}
