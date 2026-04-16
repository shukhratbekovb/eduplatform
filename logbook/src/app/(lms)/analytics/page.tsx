'use client'
import { useState } from 'react'
import { BarChart3, Users, BookOpen, TrendingUp, AlertTriangle } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  useAnalyticsOverview,
  useAnalyticsAttendance,
  useAnalyticsGrades,
  useAnalyticsRisk,
  useAnalyticsTeachers,
} from '@/lib/hooks/lms/useAnalytics'
import type { AnalyticsPeriod } from '@/types/lms'
import { cn } from '@/lib/utils/cn'

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week',  label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

const RISK_COLORS: Record<string, string> = {
  normal:   '#22c55e',
  at_risk:  '#f59e0b',
  critical: '#ef4444',
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const filters = { period }

  const { data: overview }   = useAnalyticsOverview(filters)
  const { data: attendance }  = useAnalyticsAttendance(filters)
  const { data: grades }      = useAnalyticsGrades(filters)
  const { data: risk }        = useAnalyticsRisk(filters)
  const { data: teachers }    = useAnalyticsTeachers(filters)

  const attendanceData = Array.isArray(attendance) ? attendance : []
  const gradesData     = Array.isArray(grades) ? grades : []
  const riskObj        = (risk as any) ?? {}
  const riskData       = Object.keys(riskObj).length > 0
    ? [
        { level: 'normal',   count: riskObj.normal   ?? 0, label: 'Норма' },
        { level: 'at_risk',  count: riskObj.at_risk  ?? 0, label: 'Риск' },
        { level: 'critical', count: riskObj.critical ?? 0, label: 'Критично' },
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
          Аналитика
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
        <KpiCard icon={Users}         label="Всего студентов"      value={String(ov?.totalStudents ?? '—')}        color="text-primary-600" bg="bg-primary-50" />
        <KpiCard icon={BookOpen}      label="Уроков на неделе"     value={String(ov?.lessonsThisWeek ?? '—')}      color="text-success-600" bg="bg-success-50" />
        <KpiCard icon={TrendingUp}    label="Средняя посещаемость" value={ov?.avgAttendance != null ? `${ov.avgAttendance}%` : '—'} color="text-info-600" bg="bg-info-50" />
        <KpiCard icon={AlertTriangle} label="В зоне риска"         value={String(ov?.atRiskStudents ?? '—')}       color="text-warning-600" bg="bg-warning-50" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Посещаемость">
          {attendanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Посещаемость']} />
                <Line type="monotone" dataKey="attendanceRate" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Средний балл по предметам">
          {gradesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gradesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis type="category" dataKey="subjectName" tick={{ fontSize: 11 }} tickLine={false} width={90} />
                <Tooltip formatter={(v: any) => [(v as number).toFixed(1), 'Ср. балл']} />
                <Bar dataKey="avgGrade" fill="#4F46E5" radius={[0, 4, 4, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Распределение по риску">
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

        <ChartCard title="Эффективность преподавателей">
          {teacherData.length > 0 ? (
            <div className="overflow-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Преподаватель</th>
                    <th className="text-right pb-2 font-medium">Запланировано</th>
                    <th className="text-right pb-2 font-medium">Проведено</th>
                    <th className="text-right pb-2 font-medium">% выполн.</th>
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
    </div>
  )
}

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[180px] text-sm text-gray-400">
      Нет данных за выбранный период
    </div>
  )
}
