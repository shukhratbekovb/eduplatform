'use client'
import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { useSubjects, useSubjectPerformance } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, getDaysInMonth } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import type { Grade } from '@/types/student'

const LEVEL_COLORS = {
  high:   { text: 'text-success-700', bg: 'bg-success-50', ring: 'ring-success-200', bar: '#22c55e' },
  medium: { text: 'text-warning-700', bg: 'bg-warning-50', ring: 'ring-warning-200', bar: '#f59e0b' },
  low:    { text: 'text-danger-700',  bg: 'bg-danger-50',  ring: 'ring-danger-200',  bar: '#ef4444' },
}

function gradeColor(v: number) {
  if (v >= 11) return 'bg-primary-600 text-white'
  if (v >= 9)  return 'bg-primary-300 text-white'
  if (v >= 7)  return 'bg-warning-400 text-white'
  return 'bg-danger-400 text-white'
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
    const byMonth: Record<string, { class: number[]; independent: number[] }> = {}
    for (const g of perf.grades) {
      const m = format(parseISO(g.date), 'MMM', { locale })
      if (!byMonth[m]) byMonth[m] = { class: [], independent: [] }
      if (g.type === 'class') byMonth[m].class.push(g.value)
      if (g.type === 'independent') byMonth[m].independent.push(g.value)
    }
    return Object.entries(byMonth).map(([month, vals]) => ({
      month,
      class: vals.class.length ? +(vals.class.reduce((a, b) => a + b, 0) / vals.class.length).toFixed(1) : null,
      independent: vals.independent.length ? +(vals.independent.reduce((a, b) => a + b, 0) / vals.independent.length).toFixed(1) : null,
    }))
  })()

  // Calendar: unique months from grades
  const months = perf?.grades ? [...new Set(perf.grades.map((g: Grade) => g.date.slice(0, 7)))].sort().reverse().slice(0, 2) : []

  const byDate: Record<string, number[]> = {}
  for (const g of perf?.grades ?? []) {
    if (!byDate[g.date]) byDate[g.date] = []
    byDate[g.date].push(g.value)
  }

  return (
    <div className="flex gap-5 h-full">
      {/* Subject list */}
      <div className="w-56 shrink-0 bg-white rounded-xl border border-gray-200 p-3 overflow-y-auto">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">{t('performance.title')}</h2>
        {loadingSubj ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
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
                  {s.currentAvgGrade.toFixed(1)}
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
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto">
          {/* Level card */}
          <div className={cn('col-span-2 lg:col-span-1 bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-5', lc.ring, 'ring-1')}>
            {/* Circular indicator */}
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={lc.bar} strokeWidth="3"
                  strokeDasharray={`${(perf.subject.currentAvgGrade / 12) * 100} 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-900">{perf.subject.currentAvgGrade.toFixed(1)}</span>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('performance.attendance')}</h3>
            <div className="flex gap-4 mb-3">
              {[
                { pct: perf.attendance.presentPercent, label: t('dashboard.attendance.present'), color: 'text-primary-600' },
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

          {/* Grades chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('performance.avgGradeChart')}</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[6, 12]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="class" stroke="#6366f1" strokeWidth={2} dot={false} name={t('dashboard.grade.class')} />
                  <Line type="monotone" dataKey="independent" stroke="#f59e0b" strokeWidth={2} dot={false} name={t('dashboard.grade.independent')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grades calendar */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('performance.grades')}</h3>
            <div className="space-y-4">
              {months.map((month: string) => {
                const firstDay = parseISO(`${month}-01`)
                const daysInMonth = getDaysInMonth(firstDay)
                const monthLabel = format(firstDay, 'LLLL yyyy', { locale })
                return (
                  <div key={month}>
                    <p className="text-xs font-medium text-gray-500 mb-2 capitalize">{monthLabel}</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1
                        const dateStr = `${month}-${String(day).padStart(2, '0')}`
                        const dayGrades = byDate[dateStr]
                        const avg = dayGrades ? Math.round(dayGrades.reduce((a: number, b: number) => a + b, 0) / dayGrades.length) : null
                        return (
                          <div key={day} className={cn('w-7 h-7 rounded text-xs font-medium flex items-center justify-center',
                            avg !== null ? gradeColor(avg) : 'bg-gray-100 text-gray-300'
                          )} title={dateStr}>
                            {avg ?? day}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
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
