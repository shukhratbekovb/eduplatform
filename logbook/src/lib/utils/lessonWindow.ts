import { parseISO, isAfter, isBefore, addHours } from 'date-fns'
import type { Lesson, LateEntryRequest } from '@/types/lms'

const EDIT_WINDOW_HOURS = 3

function lessonStartDateTime(lesson: Lesson): Date {
  const [h, m] = lesson.startTime.split(':').map(Number)
  const base = parseISO(lesson.date)
  base.setHours(h, m, 0, 0)
  return base
}

/**
 * A lesson is directly editable (attendance/grades can be entered)
 * from lesson start until EDIT_WINDOW_HOURS after start.
 */
export function isLessonEditable(lesson: Lesson): boolean {
  if (lesson.status === 'conducted') return false
  if (lesson.status === 'cancelled') return false
  const now       = new Date()
  const start     = lessonStartDateTime(lesson)
  const windowEnd = addHours(start, EDIT_WINDOW_HOURS)
  return isAfter(now, start) && isBefore(now, windowEnd)
}

/**
 * Returns whether the lesson window has passed without data being entered,
 * which means a Late Entry Request is required.
 */
export function needsLateRequest(lesson: Lesson): boolean {
  return lesson.status === 'incomplete'
}

/**
 * Can the teacher edit the lesson via an approved Late Entry Request?
 */
export function canEditViaLateRequest(lesson: Lesson, requests: LateEntryRequest[]): boolean {
  if (lesson.status === 'conducted') return false
  if (lesson.status === 'cancelled') return false
  const approved = requests.find(
    (r) => r.lessonId === lesson.id && r.status === 'approved'
  )
  return !!approved
}

/**
 * Returns remaining time label for the edit window, e.g. "Осталось 2ч 15м"
 */
export function getLessonWindowRemaining(lesson: Lesson): string | null {
  if (lesson.status === 'conducted' || lesson.status === 'cancelled') return null
  const now       = new Date()
  const start     = lessonStartDateTime(lesson)
  const windowEnd = addHours(start, EDIT_WINDOW_HOURS)
  if (!isAfter(now, start) || !isBefore(now, windowEnd)) return null

  const remaining = windowEnd.getTime() - now.getTime()
  const hours   = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)

  if (hours > 0) return `Осталось ${hours}ч ${minutes}м`
  return `Осталось ${minutes}м`
}

/**
 * Lesson status display label in Russian.
 */
export function lessonStatusLabel(status: Lesson['status']): string {
  const map: Record<Lesson['status'], string> = {
    scheduled:   'Запланирован',
    in_progress: 'Идёт сейчас',
    conducted:   'Проведён',
    incomplete:  'Не завершён',
    cancelled:   'Отменён',
  }
  return map[status]
}

/**
 * CSS class for lesson status left border color.
 */
export function lessonStatusBorderColor(status: Lesson['status']): string {
  const map: Record<Lesson['status'], string> = {
    scheduled:   'border-l-lesson-scheduled',
    in_progress: 'border-l-lesson-in-progress',
    conducted:   'border-l-lesson-conducted',
    incomplete:  'border-l-lesson-incomplete',
    cancelled:   'border-l-lesson-cancelled',
  }
  return map[status]
}

export function lessonStatusTextColor(status: Lesson['status']): string {
  const map: Record<Lesson['status'], string> = {
    scheduled:   'text-primary-600',
    in_progress: 'text-warning-700',
    conducted:   'text-success-700',
    incomplete:  'text-danger-700',
    cancelled:   'text-gray-500',
  }
  return map[status]
}

export function lessonStatusBgColor(status: Lesson['status']): string {
  const map: Record<Lesson['status'], string> = {
    scheduled:   'bg-primary-50',
    in_progress: 'bg-warning-50',
    conducted:   'bg-success-50',
    incomplete:  'bg-danger-50',
    cancelled:   'bg-gray-50',
  }
  return map[status]
}
