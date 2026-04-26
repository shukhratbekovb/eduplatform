'use client'
import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, BookOpen, Users, UserCheck, MapPin } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { useSchedule } from '@/lib/hooks/student'
import { getWeekStart, getWeekDates, isoDate } from '@/lib/utils/dates'
import { format, isToday } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { Lesson } from '@/types/student'

const HOUR_START  = 0
const HOUR_END    = 24
const HOUR_HEIGHT = 80
const TOTAL_HOURS = HOUR_END - HOUR_START
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i)
// Day labels resolved via t() in the component

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function lessonTopPx(startTime: string) {
  const mins = timeToMinutes(startTime) - HOUR_START * 60
  return Math.max(0, (mins / 60) * HOUR_HEIGHT)
}

function lessonHeightPx(startTime: string, endTime: string) {
  const dur = timeToMinutes(endTime) - timeToMinutes(startTime)
  return Math.max(24, (dur / 60) * HOUR_HEIGHT)
}

const STATUS_COLORS: Record<string, { border: string; bg: string }> = {
  scheduled: { border: 'border-l-primary-500', bg: 'bg-primary-50 hover:bg-primary-100' },
  completed: { border: 'border-l-success-500', bg: 'bg-success-50 hover:bg-success-100' },
  cancelled: { border: 'border-l-gray-400',    bg: 'bg-gray-50' },
}

export default function SchedulePage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)
  const locale = lang === 'ru' ? ru : enUS
  const dayLabels = Array.from({ length: 7 }, (_, i) => t(`schedule.days.short.${i}`))

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const weekDates = getWeekDates(weekStart)
  const weekStartStr = isoDate(weekStart)

  const { data: lessons = [], isLoading } = useSchedule(weekStartStr)

  const prev = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(getWeekStart(d)) }
  const next = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(getWeekStart(d)) }
  const goToday = () => setWeekStart(getWeekStart(new Date()))

  const lessonsForDay = (date: Date) => {
    const dateStr = isoDate(date)
    return (lessons as Lesson[]).filter((l) => l.weekDate === dateStr)
  }

  const weekLabel = `${format(weekDates[0], 'd MMM', { locale })} – ${format(weekDates[6], 'd MMM yyyy', { locale })}`

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-600" />
            {t('schedule.title')}
          </h1>
          <div className="flex items-center gap-1">
            <button onClick={prev} className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-600">
              {t('schedule.today')}
            </button>
            <button onClick={next} className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-medium text-gray-600">{weekLabel}</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-auto h-full">
          <div className="flex min-w-[700px]">
            {/* Time gutter */}
            <div className="w-14 shrink-0 border-r border-gray-100">
              <div className="h-12 border-b border-gray-100" />
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 flex items-start justify-end pr-2"
                    style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 8 }}
                  >
                    <span className="text-xs text-gray-400 leading-none tabular-nums">
                      {h < HOUR_END ? `${String(h).padStart(2, '0')}:00` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day columns */}
            {weekDates.map((day, idx) => {
              const dayLessons = lessonsForDay(day)
              const today = isToday(day)
              const dateNum = format(day, 'd')

              return (
                <div key={idx} className="flex-1 min-w-0 border-r border-gray-100 last:border-r-0">
                  {/* Day header */}
                  <div className={cn(
                    'h-12 border-b border-gray-100 flex flex-col items-center justify-center gap-0.5 sticky top-0 z-10',
                    today ? 'bg-primary-50' : 'bg-white'
                  )}>
                    <span className={cn('text-xs font-medium', today ? 'text-primary-600' : 'text-gray-400')}>
                      {dayLabels[idx]}
                    </span>
                    <span className={cn(
                      'text-sm font-bold leading-none',
                      today ? 'w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs' : 'text-gray-800'
                    )}>
                      {dateNum}
                    </span>
                  </div>

                  {/* Time grid */}
                  <div className={cn('relative', today && 'bg-primary-50/20')} style={{ height: GRID_HEIGHT }}>
                    {HOURS.slice(0, -1).map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: (h - HOUR_START) * HOUR_HEIGHT }} />
                    ))}
                    {HOURS.slice(0, -1).map((h) => (
                      <div key={`h${h}`} className="absolute left-0 right-0 border-t border-gray-50" style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                    ))}

                    {/* Today line */}
                    {today && <TodayLine />}

                    {/* Lessons */}
                    {dayLessons.map((lesson) => (
                      <LessonBlock key={lesson.id} lesson={lesson} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function TodayLine() {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60
  if (mins < 0 || mins > TOTAL_HOURS * 60) return null
  const top = (mins / 60) * HOUR_HEIGHT
  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="relative flex items-center">
        <div className="w-2 h-2 rounded-full bg-danger-500 shrink-0 -ml-1" />
        <div className="flex-1 h-px bg-danger-500" />
      </div>
    </div>
  )
}

function LessonBlock({ lesson }: { lesson: Lesson }) {
  const top = lessonTopPx(lesson.startTime)
  const height = lessonHeightPx(lesson.startTime, lesson.endTime)
  const isShort = height < 40
  const isMedium = height >= 40 && height < 64

  return (
    <div
      className={cn(
        'absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 overflow-hidden transition-all z-10',
        'shadow-xs hover:shadow-sm hover:z-20',
        'border-l-primary-500 bg-primary-50 hover:bg-primary-100',
      )}
      style={{ top: top + 2, height: height - 4 }}
    >
      <div className="flex items-start gap-1 h-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400 shrink-0" />
            <p className={cn('font-semibold leading-tight truncate', isShort ? 'text-xs' : 'text-sm')}>
              {lesson.groupNumber}
            </p>
          </div>
          {!isShort && lesson.subjectName && (
            <div className="flex items-center gap-1 mt-0.5">
              <BookOpen className="w-3 h-3 text-primary-400 shrink-0" />
              <p className="text-xs text-primary-600 leading-tight truncate">{lesson.subjectName}</p>
            </div>
          )}
          {!isShort && !isMedium && (
            <div className="flex items-center gap-3 mt-0.5">
              {lesson.teacherName && (
                <div className="flex items-center gap-1 min-w-0">
                  <UserCheck className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-500 leading-tight truncate">{lesson.teacherName}</p>
                </div>
              )}
              {lesson.room && (
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-400 leading-tight truncate">{lesson.room}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1 bg-primary-500" />
      </div>
    </div>
  )
}
