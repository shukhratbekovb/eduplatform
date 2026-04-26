'use client'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { useSubjects, useSubjectPerformance } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/dates'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, getDaysInMonth } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { BookOpen, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { Grade } from '@/types/student'

const LEVEL_COLORS = {
  high:   { text: 'text-success-700', bg: 'bg-success-50', ring: 'ring-success-200', bar: '#22c55e' },
  medium: { text: 'text-warning-700', bg: 'bg-warning-50', ring: 'ring-warning-200', bar: '#f59e0b' },
  low:    { text: 'text-danger-700',  bg: 'bg-danger-50',  ring: 'ring-danger-200',  bar: '#ef4444' },
}

function gradeColor(v: number) {
  if (v >= 9)  return 'bg-success-500 text-white'
  if (v >= 7)  return 'bg-primary-500 text-white'
  if (v >= 5)  return 'bg-warning-400 text-white'
  return 'bg-danger-400 text-white'
}

const GRADE_TYPE_COLORS: Record<string, string> = {
  participation: 'bg-primary-100 text-primary-700',
  homework: 'bg-amber-100 text-amber-700',
  exam: 'bg-red-100 text-red-700',
  quiz: 'bg-purple-100 text-purple-700',
  project: 'bg-teal-100 text-teal-700',
}

export default function PerformancePage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)
  const locale = lang === 'ru' ? ru : enUS

  const { data: subjects = [], isLoading: loadingSubj } = useSubjects()
  const [selectedId, setSelectedId] = useState<string>('')

  const { data: perf, isLoading: loadingPerf } = useSubjectPerformance(selectedId)

  const level = perf?.level ?? 'medium'
  const lc    = LEVEL_COLORS[level]

  // Chart data: group grades by month
  const chartData = (() => {
    if (!perf?.grades) return []
    const byMonth: Record<string, number[]> = {}
    for (const g of perf.grades) {
      const m = format(parseISO(g.date), 'MMM', { locale })
      if (!byMonth[m]) byMonth[m] = []
      byMonth[m].push(g.value)
    }
    return Object.entries(byMonth).map(([month, vals]) => ({
      month,
      avg: vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null,
    }))
  })()

  // Calendar: unique months from grades
  const months = perf?.grades ? [...new Set(perf.grades.map((g: Grade) => g.date.slice(0, 7)))].sort().reverse().slice(0, 2) : []

  const byDate: Record<string, number[]> = {}
  for (const g of perf?.grades ?? []) {
    if (!byDate[g.date]) byDate[g.date] = []
    byDate[g.date].push(g.value)
  }

  // All grades sorted by date desc for the table
  const allGrades = [...(perf?.grades ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex gap-5 h-full">
      {/* Subject list */}
      <div className="w-56 shrink-0 bg-white rounded-xl border border-gray-200 p-3 overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">{t('performance.title')}</h2>
        {loadingSubj ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-gray-400 px-2">{t('performance.noSubjects')}</p>
        ) : (
          <div className="space-y-1">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-colors',
                  selectedId === s.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <p className="text-sm font-medium leading-snug line-clamp-2">{s.name}</p>
                <p className={cn('text-xs font-bold mt-0.5', selectedId === s.id ? 'text-primary-600' : 'text-gray-400')}>
                  {s.currentAvgGrade.toFixed(1)} / 10
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail */}
      {!selectedId ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p className="text-sm">{t('performance.selectSubject')}</p>
        </div>
      ) : loadingPerf ? (
        <div className="flex-1 grid grid-cols-2 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="bg-white rounded-xl border border-gray-200 h-40 animate-pulse" />)}
        </div>
      ) : perf ? (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Top row: Level + Attendance */}
          <div className="grid grid-cols-2 gap-4">
            {/* Level card */}
            <div className={cn('bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-5', lc.ring, 'ring-1')}>
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke={lc.bar} strokeWidth="3"
                    strokeDasharray={`${(perf.subject.currentAvgGrade / 10) * 100} 100`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-gray-900">{perf.subject.currentAvgGrade.toFixed(1)}</span>
                  <span className="text-[9px] text-gray-400">/ 10</span>
                </div>
              </div>
              <div>
                <h3 className={cn('text-base font-bold', lc.text)}>{t(`performance.level.${level}`)}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t(`performance.level.${level}.desc`)}</p>
                <div className="flex gap-3 mt-3">
                  <Stat value={perf.pendingTasks} label={t('performance.pendingTasks')} color="text-primary-600" />
                  <Stat value={perf.overdueTasks} label={t('performance.overdueTasks')} color="text-danger-500" />
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('performance.attendance')}</h3>
              <div className="flex gap-4">
                {[
                  { pct: perf.attendance.presentPercent, label: t('dashboard.attendance.present'), color: 'text-success-600' },
                  { pct: perf.attendance.absentPercent,  label: t('dashboard.attendance.absent'),  color: 'text-danger-500' },
                  { pct: perf.attendance.latePercent,    label: t('dashboard.attendance.late'),    color: 'text-warning-600' },
                ].map(({ pct, label, color }) => (
                  <div key={label} className="text-center flex-1">
                    <p className={cn('text-xl font-bold', color)}>{pct}%</p>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart + Calendar row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Grades chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('performance.avgGradeChart')}</h3>
              <div className="h-36">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} name={t('performance.avgGrade')} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-gray-400">
                    {t('common.noData')}
                  </div>
                )}
              </div>
            </div>

            {/* Grades calendar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('performance.grades')}</h3>
              <div className="space-y-3">
                {months.length > 0 ? months.map((month: string) => {
                  const firstDay = parseISO(`${month}-01`)
                  const daysInMonth2 = getDaysInMonth(firstDay)
                  const monthLabel = format(firstDay, 'LLLL yyyy', { locale })
                  return (
                    <div key={month}>
                      <p className="text-xs font-medium text-gray-500 mb-1.5 capitalize">{monthLabel}</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: daysInMonth2 }, (_, i) => {
                          const day = i + 1
                          const dateStr = `${month}-${String(day).padStart(2, '0')}`
                          const dayGrades = byDate[dateStr]
                          const avg = dayGrades ? Math.round(dayGrades.reduce((a: number, b: number) => a + b, 0) / dayGrades.length) : null
                          return (
                            <div key={day} className={cn('w-7 h-7 rounded text-[10px] font-medium flex items-center justify-center',
                              avg !== null ? gradeColor(avg) : 'bg-gray-100 text-gray-300'
                            )} title={avg !== null ? `${dateStr}: ${avg}` : dateStr}>
                              {avg ?? day}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                }) : (
                  <p className="text-sm text-gray-400 text-center py-4">{t('performance.noGrades')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Grades table — all grades by date */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">
                {t('performance.allGrades')} ({allGrades.length})
              </h3>
            </div>
            {allGrades.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{t('performance.noGrades')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">{t('performance.date')}</th>
                    <th className="text-left px-4 py-2.5 font-medium">{t('performance.type')}</th>
                    <th className="text-center px-4 py-2.5 font-medium">{t('performance.grade')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allGrades.map((g) => {
                    const typeLabel = t(`grade.type.${g.type}`)
                    const typeColor = GRADE_TYPE_COLORS[g.type] ?? 'bg-gray-100 text-gray-600'
                    return (
                      <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-700">{formatDate(g.date, lang)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', typeColor)}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn('inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold', gradeColor(g.value))}>
                            {g.value}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5 leading-tight max-w-16">{label}</p>
    </div>
  )
}
