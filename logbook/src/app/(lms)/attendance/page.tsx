'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, CheckCircle2, Clock, AlertTriangle, CalendarDays } from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useSchedule } from '@/lib/hooks/lms/useSchedule'
import { useLmsStore } from '@/lib/stores/useLmsStore'
import { useCurrentUser } from '@/lib/stores/useAuthStore'
import { isLessonEditable, needsLateRequest } from '@/lib/utils/lessonWindow'
import { toIsoDate } from '@/lib/utils/dates'
import { LessonStatusBadge } from '@/components/lms/lessons/LessonStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils/cn'
import type { Lesson } from '@/types/lms'

export default function AttendancePage() {
  const user      = useCurrentUser()
  const isTeacher = user?.role === 'teacher'
  const weekStart = useLmsStore((s) => s.scheduleWeekStart)

  const { data: allLessons = [], isLoading } = useSchedule(weekStart)

  const [tab, setTab] = useState<'today' | 'groups'>('today')
  const [selectedDate, setSelectedDate] = useState<string>(toIsoDate(new Date()))

  const todayStr = toIsoDate(new Date())
  const displayDate = selectedDate || todayStr

  // Filter lessons
  const lessons = (allLessons as Lesson[]).filter((l) => {
    if (isTeacher && l.teacherId !== user?.id) return false
    return l.date === displayDate
  })

  const allWeekLessons = (allLessons as Lesson[]).filter((l) => {
    if (isTeacher && l.teacherId !== user?.id) return false
    return true
  })

  // Sort by startTime
  const sorted = [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Group by group for "Посещаемость групп" tab
  const byGroup = allWeekLessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    const key = l.group.id
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  // Format the display date header
  const displayDateObj = parseISO(displayDate)
  const dateHeader = isToday(displayDateObj)
    ? `Сегодня, ${format(displayDateObj, 'EEEE', { locale: ru })}`
    : format(displayDateObj, 'd MMMM, EEEE', { locale: ru })
  const dateHeaderCapitalized = dateHeader.charAt(0).toUpperCase() + dateHeader.slice(1)

  return (
    <div>
      {/* Date header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{dateHeaderCapitalized}</h1>
          {!isToday(displayDateObj) && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="text-sm text-primary-600 hover:underline mt-0.5"
            >
              Вернуться к сегодня
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-primary-400 transition-colors">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="hidden sm:inline">Отметить за другую дату</span>
          <input
            type="date"
            className="sr-only"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {[
          { value: 'today',  label: 'Посещаемость' },
          { value: 'groups', label: 'Посещаемость групп' },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as any)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'today' ? (
        isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-base font-medium text-gray-500">
              У вас перерыв или текущего занятия нет
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Уроки на {format(displayDateObj, 'd MMMM', { locale: ru })} не запланированы
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((lesson) => (
              <LessonAttendanceRow key={lesson.id} lesson={lesson} />
            ))}
          </div>
        )
      ) : (
        /* Посещаемость групп */
        <div className="space-y-4">
          {Object.keys(byGroup).length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Нет данных о группах" description="Расписание ещё не составлено" />
          ) : (
            Object.entries(byGroup).map(([groupId, groupLessons]) => {
              const group = groupLessons[0].group
              const conducted = groupLessons.filter((l) => l.status === 'conducted').length
              const total     = groupLessons.length
              const pct       = total > 0 ? Math.round((conducted / total) * 100) : 0
              return (
                <div key={groupId} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-400">{group.subject.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{pct}%</p>
                      <p className="text-xs text-gray-400">{conducted}/{total} уроков</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        pct >= 80 ? 'bg-success-500' : pct >= 50 ? 'bg-warning-500' : 'bg-danger-500'
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function LessonAttendanceRow({ lesson }: { lesson: Lesson }) {
  const editable    = isLessonEditable(lesson)
  const needsReq    = needsLateRequest(lesson)
  const isConducted = lesson.status === 'conducted'

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className={cn(
        'flex items-center gap-4 p-4 bg-white rounded-xl border transition-all hover:shadow-sm',
        editable
          ? 'border-primary-300 ring-1 ring-primary-100'
          : lesson.status === 'incomplete' ? 'border-danger-200'
          : 'border-gray-200'
      )}
    >
      {/* Status bar */}
      <div className={cn(
        'w-1 self-stretch rounded-full shrink-0',
        lesson.status === 'conducted'   ? 'bg-success-500' :
        lesson.status === 'in_progress' ? 'bg-warning-500' :
        lesson.status === 'incomplete'  ? 'bg-danger-500'  :
        lesson.status === 'cancelled'   ? 'bg-gray-300'    :
        'bg-primary-400'
      )} />

      {/* Time */}
      <div className="shrink-0 text-center w-14">
        <p className="text-sm font-bold text-gray-900 tabular-nums">{lesson.startTime}</p>
        <p className="text-xs text-gray-400 tabular-nums">{lesson.endTime}</p>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{lesson.group.name}</p>
          <LessonStatusBadge status={lesson.status} />
          {editable && (
            <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
              Открыто для ввода
            </span>
          )}
          {needsReq && (
            <span className="text-xs bg-warning-100 text-warning-700 px-1.5 py-0.5 rounded-full font-medium">
              Нужен запрос МУП
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {lesson.group.subject.name}
          {lesson.room && ` · ${lesson.room.name}`}
          {lesson.topic && ` · "${lesson.topic}"`}
        </p>
      </div>

      {/* Conducted stat */}
      {isConducted && (
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1 text-success-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">{lesson.group.studentCount}</span>
          </div>
          <p className="text-xs text-gray-400">чел.</p>
        </div>
      )}

      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  )
}
