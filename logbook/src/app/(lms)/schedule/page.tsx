'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, CalendarDays, RefreshCw, Pencil, Trash2, BookOpen, Users, UserCheck, MapPin, Clock, X, Check } from 'lucide-react'
import { addWeeks, subWeeks, parseISO, format, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useSchedule, useUpdateLesson, useCancelLesson } from '@/lib/hooks/lms/useSchedule'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { useRooms, useLmsUsers, useSubjects } from '@/lib/hooks/lms/useSettings'
import { useLmsStore } from '@/lib/stores/useLmsStore'
import { useIsDirectorOrMup, useCurrentUser } from '@/lib/stores/useAuthStore'
import { useT } from '@/lib/i18n'
import { LessonForm } from '@/components/lms/schedule/LessonForm'
import { Button } from '@/components/ui/button'
import { getWeekDays, toIsoDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { Lesson } from '@/types/lms'

// Calendar constants
const HOUR_START  = 0
const HOUR_END    = 24
const HOUR_HEIGHT = 80  // px per hour
const TOTAL_HOURS = HOUR_END - HOUR_START
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i)

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-primary-500',
  completed: 'bg-success-500',
  cancelled: 'bg-gray-400',
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
  const t            = useT()
  const weekStart    = useLmsStore((s) => s.scheduleWeekStart)
  const setWeekStart = useLmsStore((s) => s.setScheduleWeekStart)
  const canManage    = useIsDirectorOrMup()
  const user         = useCurrentUser()

  const DAY_LABELS = [t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat'), t('weekday.sun')]

  const [showForm, setShowForm]           = useState(false)
  const [defaultDate, setDefaultDate]     = useState<string>()
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [filterTeacherIds, setFilterTeacherIds] = useState<Set<string>>(new Set())
  const [filterRoomIds, setFilterRoomIds]       = useState<Set<string>>(new Set())

  const isTeacher = user?.role === 'teacher'

  // API filter: only teacherId for teacher role
  const apiFilters: Record<string, string> = {}
  if (isTeacher && user?.id) apiFilters.teacherId = user.id

  const { data: rawLessons = [], isLoading, refetch } = useSchedule(weekStart, apiFilters)

  // Client-side multiselect filtering
  const lessons = useMemo(() => {
    let result = rawLessons as Lesson[]
    if (filterTeacherIds.size > 0)
      result = result.filter((l) => l.teacherId && filterTeacherIds.has(l.teacherId))
    if (filterRoomIds.size > 0)
      result = result.filter((l) => l.roomId && filterRoomIds.has(l.roomId))
    return result
  }, [rawLessons, filterTeacherIds, filterRoomIds])
  const { data: groups = [] }     = useGroups()
  const { data: subjects = [] }   = useSubjects()
  const { data: rooms = [] }      = useRooms()
  const { data: allUsers = [] }   = useLmsUsers()

  const groupMap   = useMemo(() => new Map((groups as any[]).map((g: any) => [g.id, g.name])), [groups])
  const subjectMap = useMemo(() => new Map((subjects as any[]).map((s: any) => [s.id, s.name])), [subjects])
  const teacherMap = useMemo(() => new Map((allUsers as any[]).map((u: any) => [u.id, u.name])), [allUsers])
  const roomMap    = useMemo(() => new Map((rooms as any[]).map((r: any) => [r.id, r.name])), [rooms])

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
            {t('schedule.title')}
          </h1>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon-sm" onClick={goBack}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="secondary" size="sm" onClick={goToday} className="text-xs px-3">{t('common.today')}</Button>
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
              {t('schedule.addLesson')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters for Director/MUP */}
      {canManage && (
        <div className="flex items-center gap-2 mb-4 flex-wrap shrink-0">
          <MultiSelectFilter
            label={t('schedule.teachers')}
            items={teachers.map((tc: any) => ({ id: tc.id, name: tc.name }))}
            selected={filterTeacherIds}
            onChange={setFilterTeacherIds}
          />
          <MultiSelectFilter
            label={t('schedule.rooms')}
            items={(rooms as any[]).filter((r: any) => r.isActive).map((r: any) => ({ id: r.id, name: r.name }))}
            selected={filterRoomIds}
            onChange={setFilterRoomIds}
          />
          {(filterTeacherIds.size > 0 || filterRoomIds.size > 0) && (
            <button
              onClick={() => { setFilterTeacherIds(new Set()); setFilterRoomIds(new Set()) }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {t('common.reset')}
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

                    {/* Half-hour lines */}
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
                        groupName={groupMap.get(lesson.groupId)}
                        subjectName={lesson.subjectId ? subjectMap.get(lesson.subjectId) : undefined}
                        teacherName={lesson.teacherId ? teacherMap.get(lesson.teacherId) : undefined}
                        roomName={lesson.roomId ? roomMap.get(lesson.roomId) : undefined}
                        onClick={() => setSelectedLesson(lesson)}
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

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          groupName={groupMap.get(selectedLesson.groupId)}
          subjectName={selectedLesson.subjectId ? subjectMap.get(selectedLesson.subjectId) : undefined}
          teacherName={selectedLesson.teacherId ? teacherMap.get(selectedLesson.teacherId) : undefined}
          roomName={selectedLesson.roomId ? roomMap.get(selectedLesson.roomId) : undefined}
          teachers={(allUsers as any[]).filter((u: any) => u.role === 'teacher')}
          activeRooms={(rooms as any[]).filter((r: any) => r.isActive)}
          canManage={canManage}
          onClose={() => setSelectedLesson(null)}
        />
      )}
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
  lesson, groupName, subjectName, teacherName, roomName, onClick,
}: {
  lesson: Lesson
  groupName?: string
  subjectName?: string
  teacherName?: string
  roomName?: string
  onClick?: () => void
}) {
  const t      = useT()
  const top    = lessonTopPx(lesson.startTime)
  const height = lessonHeightPx(lesson.startTime, lesson.endTime)
  const isShort  = height < 40
  const isMedium = height >= 40 && height < 64

  const borderColors: Record<string, string> = {
    scheduled: 'border-l-primary-500',
    completed: 'border-l-success-500',
    cancelled: 'border-l-gray-400',
  }
  const bgColors: Record<string, string> = {
    scheduled: 'bg-primary-50 hover:bg-primary-100',
    completed: 'bg-success-50 hover:bg-success-100',
    cancelled: 'bg-gray-50',
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className={cn(
        'absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 overflow-hidden transition-all z-10 text-left',
        'shadow-xs hover:shadow-sm hover:z-20 cursor-pointer',
        borderColors[lesson.status] ?? 'border-l-gray-300',
        bgColors[lesson.status] ?? 'bg-gray-50',
        lesson.status === 'cancelled' && 'opacity-50',
      )}
      style={{ top: top + 2, height: height - 4 }}
    >
      <div className="flex items-start gap-1 h-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400 shrink-0" />
            <p className={cn('font-semibold leading-tight truncate', isShort ? 'text-xs' : 'text-sm')}>
              {groupName || t('schedule.group')}
            </p>
          </div>
          {!isShort && subjectName && (
            <div className="flex items-center gap-1 mt-0.5">
              <BookOpen className="w-3 h-3 text-primary-400 shrink-0" />
              <p className="text-xs text-primary-600 leading-tight truncate">{subjectName}</p>
            </div>
          )}
          {!isShort && !isMedium && (
            <div className="flex items-center gap-3 mt-0.5">
              {teacherName && (
                <div className="flex items-center gap-1 min-w-0">
                  <UserCheck className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-500 leading-tight truncate">{teacherName}</p>
                </div>
              )}
              {roomName && (
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-400 leading-tight truncate">{roomName}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1', STATUS_DOT[lesson.status] ?? 'bg-gray-300')} />
      </div>
    </button>
  )
}

// ── Lesson detail modal ─────────────────────────────────────────────────────

function useDeleteLesson() {
  const t = useT()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/lms/lessons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'schedule'] })
      toast.success(t('schedule.lessonDeleted'))
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || t('schedule.deleteFailed')),
  })
}

function LessonDetailModal({
  lesson, groupName, subjectName, teacherName, roomName,
  teachers, activeRooms, canManage, onClose,
}: {
  lesson: Lesson
  groupName?: string; subjectName?: string; teacherName?: string; roomName?: string
  teachers: any[]; activeRooms: any[]
  canManage: boolean; onClose: () => void
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [editDate, setEditDate] = useState(lesson.date)
  const [editStart, setEditStart] = useState(lesson.startTime)
  const [editEnd, setEditEnd] = useState(lesson.endTime)
  const [editTeacherId, setEditTeacherId] = useState(lesson.teacherId ?? '')
  const [editRoomId, setEditRoomId] = useState(lesson.roomId ?? '')
  const [editTopic, setEditTopic] = useState(lesson.topic ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { mutate: updateLesson, isPending: saving } = useUpdateLesson()
  const { mutate: deleteLesson, isPending: deleting } = useDeleteLesson()

  const isCompleted = lesson.status === 'completed'
  const isCancelled = lesson.status === 'cancelled'
  const isPast = new Date(`${lesson.date}T${lesson.startTime}`) < new Date()
  const canEdit = canManage && !isCompleted && !isPast
  const canDelete = canManage && !isCompleted

  const handleSave = () => {
    updateLesson(
      { id: lesson.id, data: {
        date: editDate, startTime: editStart, endTime: editEnd,
        teacherId: editTeacherId || undefined,
        roomId: editRoomId || undefined,
        topic: editTopic || undefined,
      } as any },
      { onSuccess: () => { setEditing(false); onClose() } },
    )
  }

  const handleDelete = () => {
    deleteLesson(lesson.id, { onSuccess: onClose })
  }

  const statusLabel = isCompleted ? t('lesson.conducted') : isCancelled ? t('lesson.cancelled') : t('lesson.scheduled')
  const statusColor = isCompleted ? 'text-success-600 bg-success-50' : isCancelled ? 'text-gray-500 bg-gray-100' : 'text-primary-600 bg-primary-50'

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? t('schedule.editLesson') : t('schedule.lessonInfo')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('schedule.date')}</label>
                <DatePicker value={editDate} onChange={setEditDate} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('schedule.start')}</label>
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('schedule.end')}</label>
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('schedule.teacher')}</label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                >
                  <option value="">— {t('common.notSelected')} —</option>
                  {teachers.map((tc: any) => (
                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('schedule.room')}</label>
                <select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white"
                >
                  <option value="">— {t('common.notSelected')} —</option>
                  {activeRooms.map((r: any) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('schedule.topic')}</label>
                <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} placeholder={t('schedule.topic')} />
              </div>
            </div>
          ) : confirmDelete ? (
            <div className="text-center py-4">
              <Trash2 className="w-10 h-10 text-danger-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">{t('schedule.deleteConfirm')}</p>
              <p className="text-xs text-gray-400">{t('schedule.deleteWarning')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status */}
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', statusColor)}>
                {statusLabel}
              </span>

              {/* Info rows */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{groupName || '—'}</p>
                    <p className="text-xs text-gray-400">{t('schedule.group')}</p>
                  </div>
                </div>
                {subjectName && (
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{subjectName}</p>
                      <p className="text-xs text-gray-400">{t('schedule.subject')}</p>
                    </div>
                  </div>
                )}
                {teacherName && (
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{teacherName}</p>
                      <p className="text-xs text-gray-400">{t('schedule.teacher')}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lesson.date} · {lesson.startTime}–{lesson.endTime}</p>
                    <p className="text-xs text-gray-400">{t('schedule.dateTime')}</p>
                  </div>
                </div>
                {roomName && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{roomName}</p>
                      <p className="text-xs text-gray-400">{t('schedule.room')}</p>
                    </div>
                  </div>
                )}
                {lesson.topic && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{t('schedule.topic')}</p>
                    <p className="text-sm text-gray-900">{lesson.topic}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {editing ? (
            <>
              <Button variant="secondary" onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} loading={saving}>{t('common.save')}</Button>
            </>
          ) : confirmDelete ? (
            <>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>{t('common.delete')}</Button>
            </>
          ) : (
            <>
              {canDelete && (
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4" />
                  {t('common.delete')}
                </Button>
              )}
              {canEdit && (
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-4 h-4" />
                  {t('common.edit')}
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={onClose}>{t('common.close')}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── MultiSelect filter dropdown ─────────────────────────────────────────────

function MultiSelectFilter({
  label, items, selected, onChange,
}: {
  label: string
  items: { id: string; name: string }[]
  selected: Set<string>
  onChange: (v: Set<string>) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange(next)
  }

  const count = selected.size

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 h-8 transition-colors',
          count > 0
            ? 'border-primary-300 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        )}
      >
        {label}
        {count > 0 && (
          <span className="bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 w-56 max-h-64 overflow-y-auto py-1">
          {items.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">{t('common.noData')}</p>
          ) : (
            items.map((item) => {
              const checked = selected.has(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors',
                    checked ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700',
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300',
                  )}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="truncate">{item.name}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
