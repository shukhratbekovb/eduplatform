'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, RefreshCw } from 'lucide-react'
import { addWeeks, subWeeks, parseISO, format, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useSchedule } from '@/lib/hooks/lms/useSchedule'
import { useRooms, useLmsUsers } from '@/lib/hooks/lms/useSettings'
import { useLmsStore } from '@/lib/stores/useLmsStore'
import { useIsDirectorOrMup, useCurrentUser } from '@/lib/stores/useAuthStore'
import { LessonForm } from '@/components/lms/schedule/LessonForm'
import { Button } from '@/components/ui/button'
import { getWeekDays, toIsoDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import type { Lesson } from '@/types/lms'

// Calendar constants
const HOUR_START  = 8   // 8:00
const HOUR_END    = 21  // 21:00
const HOUR_HEIGHT = 64  // px per hour
const TOTAL_HOURS = HOUR_END - HOUR_START
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i)

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const STATUS_DOT: Record<Lesson['status'], string> = {
  scheduled:   'bg-primary-500',
  in_progress: 'bg-warning-500 animate-pulse',
  conducted:   'bg-success-500',
  incomplete:  'bg-danger-500',
  cancelled:   'bg-gray-400',
}

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

export default function SchedulePage() {
  const weekStart    = useLmsStore((s) => s.scheduleWeekStart)
  const setWeekStart = useLmsStore((s) => s.setScheduleWeekStart)
  const canManage    = useIsDirectorOrMup()
  const user         = useCurrentUser()

  const [showForm, setShowForm]           = useState(false)
  const [defaultDate, setDefaultDate]     = useState<string>()
  const [filterTeacherId, setFilterTeacher] = useState('')
  const [filterRoomId, setFilterRoom]     = useState('')

  const filters: Record<string, string> = {}
  if (filterTeacherId) filters.teacherId = filterTeacherId
  if (filterRoomId)    filters.roomId    = filterRoomId

  const { data: lessons = [], isLoading, refetch } = useSchedule(weekStart, filters)
  const { data: rooms = [] }    = useRooms()
  const { data: allUsers = [] } = useLmsUsers()

  const weekDays = getWeekDays(weekStart)

  const goBack    = () => setWeekStart(toIsoDate(subWeeks(parseISO(weekStart), 1)))
  const goForward = () => setWeekStart(toIsoDate(addWeeks(parseISO(weekStart), 1)))
  const goToday   = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(d)
    mon.setDate(d.getDate() + diff)
    setWeekStart(toIsoDate(mon))
  }

  const lessonsForDay = (date: Date) => {
    const dateStr = toIsoDate(date)
    return (lessons as Lesson[]).filter((l) => l.date === dateStr)
  }

  const weekLabel = weekDays.length > 0
    ? `${format(weekDays[0], 'd MMM', { locale: ru })} – ${format(weekDays[6], 'd MMM yyyy', { locale: ru })}`
    : ''

  const teachers = (allUsers as any[]).filter((u) => u.role === 'teacher')

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-600" />
            Расписание
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon-sm" onClick={goBack}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={goToday} className="text-xs px-3">Сегодня</Button>
            <Button variant="secondary" size="icon-sm" onClick={goForward}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <span className="text-sm font-medium text-gray-600">{weekLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => refetch()}>
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => { setDefaultDate(undefined); setShowForm(true) }}>
              <Plus className="w-4 h-4" />
              Добавить урок
            </Button>
          )}
        </div>
      </div>

      {/* Filters for Director/MUP */}
      {canManage && (
        <div className="flex items-center gap-2 mb-4 flex-wrap shrink-0">
          <select
            value={filterTeacherId}
            onChange={(e) => setFilterTeacher(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:border-primary-400 h-8"
          >
            <option value="">Все преподаватели</option>
            {teachers.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            value={filterRoomId}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:border-primary-400 h-8"
          >
            <option value="">Все кабинеты</option>
            {(rooms as any[]).map((r: any) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {(filterTeacherId || filterRoomId) && (
            <button
              onClick={() => { setFilterTeacher(''); setFilterRoom('') }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Сбросить
            </button>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-auto h-full">
          <div className="flex min-w-[700px]">
            {/* Time gutter */}
            <div className="w-14 shrink-0 border-r border-gray-100">
              {/* Corner */}
              <div className="h-12 border-b border-gray-100" />
              {/* Hour labels */}
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
            {weekDays.map((day, idx) => {
              const dayLessons = lessonsForDay(day)
              const today      = isToday(day)
              const dateNum    = format(day, 'd')
              const dateLabel  = DAY_LABELS[idx]

              return (
                <div key={idx} className={cn('flex-1 min-w-0 border-r border-gray-100 last:border-r-0')}>
                  {/* Day header */}
                  <div
                    className={cn(
                      'h-12 border-b border-gray-100 flex flex-col items-center justify-center gap-0.5 sticky top-0 z-10',
                      today ? 'bg-primary-50' : 'bg-white'
                    )}
                  >
                    <span className={cn('text-xs font-medium', today ? 'text-primary-600' : 'text-gray-400')}>
                      {dateLabel}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-bold leading-none',
                        today
                          ? 'w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs'
                          : 'text-gray-800'
                      )}
                    >
                      {dateNum}
                    </span>
                  </div>

                  {/* Timed grid */}
                  <div
                    className={cn('relative', today && 'bg-primary-50/20')}
                    style={{ height: GRID_HEIGHT }}
                    onClick={canManage ? () => { setDefaultDate(toIsoDate(day)); setShowForm(true) } : undefined}
                  >
                    {/* Hour grid lines */}
                    {HOURS.slice(0, -1).map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Half-hour lines (lighter) */}
                    {HOURS.slice(0, -1).map((h) => (
                      <div
                        key={`h${h}`}
                        className="absolute left-0 right-0 border-t border-gray-50"
                        style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {today && <TodayLine />}

                    {/* Lessons */}
                    {dayLessons.map((lesson) => (
                      <CalendarLessonBlock
                        key={lesson.id}
                        lesson={lesson}
                        onAddLesson={canManage ? (e) => { e.stopPropagation(); setDefaultDate(toIsoDate(day)); setShowForm(true) } : undefined}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <LessonForm open={showForm} onOpenChange={setShowForm} defaultDate={defaultDate} />
    </div>
  )
}

function TodayLine() {
  const now  = new Date()
  const mins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60
  if (mins < 0 || mins > TOTAL_HOURS * 60) return null
  const top  = (mins / 60) * HOUR_HEIGHT

  return (
    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
      <div className="relative flex items-center">
        <div className="w-2 h-2 rounded-full bg-danger-500 shrink-0 -ml-1" />
        <div className="flex-1 h-px bg-danger-500" />
      </div>
    </div>
  )
}

function CalendarLessonBlock({
  lesson,
  onAddLesson,
}: {
  lesson: Lesson
  onAddLesson?: (e: React.MouseEvent) => void
}) {
  const top    = lessonTopPx(lesson.startTime)
  const height = lessonHeightPx(lesson.startTime, lesson.endTime)
  const isShort = height < 48

  const borderColors: Record<Lesson['status'], string> = {
    scheduled:   'border-l-primary-500',
    in_progress: 'border-l-warning-500',
    conducted:   'border-l-success-500',
    incomplete:  'border-l-danger-500',
    cancelled:   'border-l-gray-400',
  }
  const bgColors: Record<Lesson['status'], string> = {
    scheduled:   'bg-primary-50 hover:bg-primary-100',
    in_progress: 'bg-warning-50 hover:bg-warning-100',
    conducted:   'bg-success-50 hover:bg-success-100',
    incomplete:  'bg-danger-50 hover:bg-danger-100',
    cancelled:   'bg-gray-50',
  }

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'absolute left-1 right-1 rounded border-l-4 px-1.5 py-1 overflow-hidden transition-all z-10',
        'shadow-xs hover:shadow-sm hover:z-20',
        borderColors[lesson.status],
        bgColors[lesson.status],
        lesson.status === 'cancelled' && 'opacity-50',
      )}
      style={{ top: top + 2, height: height - 4 }}
    >
      <div className="flex items-start gap-1 h-full">
        <div className="flex-1 min-w-0">
          <p className={cn('font-semibold leading-tight truncate', isShort ? 'text-[10px]' : 'text-xs')}>
            {lesson.group.name}
          </p>
          {!isShort && (
            <>
              <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
                {lesson.startTime}–{lesson.endTime}
              </p>
              {lesson.room && (
                <p className="text-[10px] text-gray-400 leading-tight truncate">{lesson.room.name}</p>
              )}
              {lesson.status === 'incomplete' && (
                <p className="text-[10px] text-danger-600 font-medium mt-0.5">⚠ Нет данных</p>
              )}
            </>
          )}
        </div>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-0.5', STATUS_DOT[lesson.status])} />
      </div>
    </Link>
  )
}
