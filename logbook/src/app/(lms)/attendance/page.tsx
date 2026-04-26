'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronRight, CheckCircle2, Clock, AlertTriangle, CalendarDays } from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useSchedule } from '@/lib/hooks/lms/useSchedule'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { useLmsStore } from '@/lib/stores/useLmsStore'
import { useCurrentUser } from '@/lib/stores/useAuthStore'
import { isLessonEditable, needsLateRequest } from '@/lib/utils/lessonWindow'
import { toIsoDate } from '@/lib/utils/dates'
import { LessonStatusBadge } from '@/components/lms/lessons/LessonStatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { Lesson } from '@/types/lms'

export default function AttendancePage() {
  const t       = useT()
  const user      = useCurrentUser()
  const isTeacher = user?.role === 'teacher'
  const isDirectorOrMup = user?.role === 'director' || user?.role === 'mup'
  const weekStart = useLmsStore((s) => s.scheduleWeekStart)

  const filters: Record<string, string> = {}
  if (isTeacher && user?.id) filters.teacherId = user.id

  const { data: allLessons = [], isLoading } = useSchedule(weekStart, filters)
  const { data: groups = [] } = useGroups()
  const groupMap = useMemo(() => new Map((groups as any[]).map((g: any) => [g.id, g])), [groups])

  const [tab, setTab] = useState<'today' | 'groups'>(isDirectorOrMup ? 'groups' : 'today')
  const [selectedDate, setSelectedDate] = useState<string>(toIsoDate(new Date()))

  const todayStr = toIsoDate(new Date())
  const displayDate = selectedDate || todayStr

  // Filter by selected date
  const lessons = (allLessons as Lesson[]).filter((l) => l.date === displayDate)
  const allWeekLessons = allLessons as Lesson[]

  // Sort by startTime
  const sorted = [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Group by group for "Посещаемость групп" tab
  const byGroup = allWeekLessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    const key = l.groupId
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  // Format the display date header
  const displayDateObj = parseISO(displayDate)
  const dateHeader = isToday(displayDateObj)
    ? `${t('common.today')}, ${format(displayDateObj, 'EEEE', { locale: ru })}`
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
              {t('attendance.backToToday')}
            </button>
          )}
        </div>
        {!isDirectorOrMup && (
          <div className="w-56">
            <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder={t('attendance.markOtherDate')} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5">
        {[
          ...(!isDirectorOrMup ? [{ value: 'today', label: t('attendance.title') }] : []),
          { value: 'groups', label: t('attendance.groupAttendance') },
        ].map((tb) => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value as any)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === tb.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tb.label}
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
              {t('attendance.breakTime')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {t('attendance.noLessons')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((lesson) => (
              <LessonAttendanceRow key={lesson.id} lesson={lesson} groupName={groupMap.get(lesson.groupId)?.name} />
            ))}
          </div>
        )
      ) : (
        /* Посещаемость групп */
        <div className="space-y-4">
          {Object.keys(byGroup).length === 0 ? (
            <EmptyState icon={CheckCircle2} title={t('attendance.noGroups')} description={t('attendance.noSchedule')} />
          ) : (
            Object.entries(byGroup).map(([groupId, groupLessons]) => {
              const group = groupMap.get(groupId)
              const groupName = group?.name ?? groupId.slice(0, 8)
              const directionName = group?.directionName
              const conducted = groupLessons.filter((l) => l.status === 'completed').length
              const total     = groupLessons.length
              const pct       = total > 0 ? Math.round((conducted / total) * 100) : 0
              return (
                <div key={groupId} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{groupName}</p>
                      {directionName && <p className="text-xs text-gray-400">{directionName}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{pct}%</p>
                      <p className="text-xs text-gray-400">{conducted}/{total} {t('attendance.lessons')}</p>
                    </div>
                  </div>
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

function LessonAttendanceRow({ lesson, groupName }: { lesson: Lesson; groupName?: string }) {
  const t         = useT()
  const editable    = isLessonEditable(lesson)
  const needsReq    = needsLateRequest(lesson)
  const isConducted = lesson.status === 'completed'

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className={cn(
        'flex items-center gap-4 p-4 bg-white rounded-xl border transition-all hover:shadow-sm',
        editable
          ? 'border-primary-300 ring-1 ring-primary-100'
          : lesson.status === 'cancelled' ? 'border-gray-200'
          : 'border-gray-200'
      )}
    >
      {/* Status bar */}
      <div className={cn(
        'w-1 self-stretch rounded-full shrink-0',
        lesson.status === 'completed' ? 'bg-success-500' :
        lesson.status === 'cancelled' ? 'bg-gray-400' :
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
          <p className="text-sm font-semibold text-gray-900 truncate">{groupName ?? ''}</p>
          <LessonStatusBadge status={lesson.status} />
          {editable && (
            <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">
              {t('attendance.openForInput')}
            </span>
          )}
          {needsReq && (
            <span className="text-xs bg-warning-100 text-warning-700 px-1.5 py-0.5 rounded-full font-medium">
              {t('attendance.needMupRequest')}
            </span>
          )}
        </div>
        {lesson.topic && (
          <p className="text-xs text-gray-400 mt-1">"{lesson.topic}"</p>
        )}
      </div>

      {/* Conducted stat */}
      {isConducted && (
        <div className="shrink-0 text-right">
          <div className="flex items-center gap-1 text-success-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">{(lesson as any).group?.studentCount ?? 0}</span>
          </div>
          <p className="text-xs text-gray-400">{t('attendance.people')}</p>
        </div>
      )}

      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  )
}
