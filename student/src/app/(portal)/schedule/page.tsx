'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Wifi } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { useSchedule } from '@/lib/hooks/student'
import { getWeekStart, getWeekDates, isoDate, formatMonthYear } from '@/lib/utils/dates'
import { format, isToday, parseISO } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { Lesson } from '@/types/student'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 9) // 09:00 – 22:00

const SUBJECT_COLORS = [
  'bg-primary-500', 'bg-warning-500', 'bg-success-600', 'bg-info-500', 'bg-danger-500',
]

function getSubjectColor(id: string) {
  let hash = 0
  for (const c of id) hash += c.charCodeAt(0)
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length]
}

function timeToRow(time: string) {
  const [h, m] = time.split(':').map(Number)
  return (h - 9) * 2 + Math.floor(m / 30) + 1
}
function timeDuration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60 + em) - (sh * 60 + sm)) / 30
}

export default function SchedulePage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)
  const locale = lang === 'ru' ? ru : enUS

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const weekDates = getWeekDates(weekStart)
  const weekStartStr = isoDate(weekStart)

  const { data: lessons = [], isLoading } = useSchedule(weekStartStr)

  const prev = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(getWeekStart(d)) }
  const next = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(getWeekStart(d)) }

  // Index lessons by weekDate
  const byDate: Record<string, Lesson[]> = {}
  for (const l of lessons) {
    if (!byDate[l.weekDate]) byDate[l.weekDate] = []
    byDate[l.weekDate].push(l)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h1>
        <button className="text-sm text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors font-medium">
          {t('schedule.exams')}
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5 w-fit">
        <button onClick={prev} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors" aria-label={t('schedule.prevWeek')}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800 capitalize min-w-36 text-center">
          {format(weekStart, 'LLLL yyyy', { locale })}
        </span>
        <button onClick={next} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors" aria-label={t('schedule.nextWeek')}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
        {/* Day headers */}
        <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          <div className="p-3 border-r border-gray-100" />
          {weekDates.map((date, i) => {
            const today = isToday(date)
            return (
              <div key={i} className={cn(
                'p-3 text-center border-r border-gray-100 last:border-r-0',
                today && 'bg-primary-50'
              )}>
                <p className={cn('text-xs font-medium', today ? 'text-primary-600' : 'text-gray-400')}>
                  {t(`schedule.days.short.${i}`)}
                </p>
                <p className={cn(
                  'text-sm font-bold mt-0.5',
                  today ? 'text-primary-600' : 'text-gray-700'
                )}>
                  {format(date, 'd')}
                </p>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="relative" style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)' }}>
          {/* Hour rows */}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-gray-50 border-r border-gray-100 px-2 py-2 text-xs text-gray-400 text-right">
                {hour}:00
              </div>
              {weekDates.map((_, di) => (
                <div key={di} className="border-b border-gray-50 border-r border-gray-100 last:border-r-0 h-10" />
              ))}
            </div>
          ))}

          {/* Lessons overlay */}
          {!isLoading && weekDates.map((date, colIdx) => {
            const dateStr = isoDate(date)
            const dayLessons = byDate[dateStr] ?? []
            if (dayLessons.length === 0) return null
            return dayLessons.map((lesson) => {
              const rowStart = timeToRow(lesson.startTime)
              const rowSpan  = timeDuration(lesson.startTime, lesson.endTime)
              const colClass = getSubjectColor(lesson.subjectId)
              return (
                <div
                  key={lesson.id}
                  className={cn('absolute rounded-lg mx-1 px-2 py-1.5 text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity', colClass)}
                  style={{
                    gridColumn: `${colIdx + 2}`,
                    top:    `${(rowStart - 1) * 40}px`,
                    height: `${rowSpan * 40 - 4}px`,
                    left:   `${(60 + colIdx * ((100) / 7))}px`,
                    width:  `calc(${100 / 7}% - 8px)`,
                    position: 'absolute',
                  }}
                >
                  <p className="text-xs font-semibold leading-tight line-clamp-2">{lesson.subjectName}</p>
                  <p className="text-xs opacity-80 mt-0.5">{lesson.startTime} – {lesson.endTime}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {lesson.isOnline && <Wifi className="w-2.5 h-2.5 opacity-80" />}
                    <span className="text-xs opacity-75">№ {lesson.groupNumber}</span>
                  </div>
                </div>
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}
