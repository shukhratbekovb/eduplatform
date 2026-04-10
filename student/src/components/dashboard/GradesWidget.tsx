'use client'
import { useT } from '@/lib/i18n'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DashboardData } from '@/types/student'

interface Props { data?: DashboardData; isLoading?: boolean }

export function GradesWidget({ data, isLoading }: Props) {
  const t = useT()

  const avg = data?.avgGrades

  const grades = avg ? [
    { label: t('dashboard.grade.class'),       value: avg.class },
    { label: t('dashboard.grade.independent'), value: avg.independent },
    { label: t('dashboard.grade.control'),     value: avg.control },
  ] : []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{t('dashboard.avgGrade')}</h3>
        <span className="text-xs text-gray-400">{t('dashboard.avgGrade.period')}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Grade rows */}
          <div className="space-y-2 mb-4">
            {grades.map((g) => (
              <div key={g.label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{g.label}</span>
                <span className="text-xl font-bold text-gray-900">{g.value.toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          {data?.gradesByMonth && (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.gradesByMonth} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[6, 12]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    itemStyle={{ color: '#374151' }}
                  />
                  <Line type="monotone" dataKey="class" stroke="#6366f1" strokeWidth={2} dot={false} name={t('dashboard.grade.class')} />
                  <Line type="monotone" dataKey="independent" stroke="#f59e0b" strokeWidth={2} dot={false} name={t('dashboard.grade.independent')} />
                  <Line type="monotone" dataKey="control" stroke="#06b6d4" strokeWidth={2} dot={false} name={t('dashboard.grade.control')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {[
              { color: '#6366f1', label: t('dashboard.grade.class') },
              { color: '#f59e0b', label: t('dashboard.grade.independent') },
              { color: '#06b6d4', label: t('dashboard.grade.control') },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
