import { parseISO, isAfter, isBefore, endOfDay } from 'date-fns'
import type { Lesson, LateEntryRequest } from '@/types/lms'

function lessonStartDateTime(lesson: Lesson): Date {
  const [h, m] = lesson.startTime.split(':').map(Number)
  const base = parseISO(lesson.date)
  base.setHours(h, m, 0, 0)
  return base
}

/** End of lesson day (23:59:59) */
function lessonDayEnd(lesson: Lesson): Date {
  return endOfDay(parseISO(lesson.date))
}

/**
 * Editable from lesson start until end of that day (23:59).
 */
export function isLessonEditable(lesson: Lesson): boolean {
  if (lesson.status === 'completed') return false
  if (lesson.status === 'cancelled') return false
  const now = new Date()
  const start = lessonStartDateTime(lesson)
  const dayEnd = lessonDayEnd(lesson)
  return isAfter(now, start) && isBefore(now, dayEnd)
}

/**
 * Needs late request if the lesson day has passed without being conducted.
 */
export function needsLateRequest(lesson: Lesson): boolean {
  if (lesson.status !== 'scheduled') return false
  const now = new Date()
  const dayEnd = lessonDayEnd(lesson)
  return isAfter(now, dayEnd)
}

export function canEditViaLateRequest(lesson: Lesson, requests: LateEntryRequest[]): boolean {
  if (lesson.status === 'completed') return false
  if (lesson.status === 'cancelled') return false
  const approved = requests.find(
    (r) => r.lessonId === lesson.id && r.status === 'approved'
  )
  return !!approved
}

export function getLessonWindowRemaining(lesson: Lesson): string | null {
  if (lesson.status === 'completed' || lesson.status === 'cancelled') return null
  const now = new Date()
  const start = lessonStartDateTime(lesson)
  const dayEnd = lessonDayEnd(lesson)
  if (!isAfter(now, start) || !isBefore(now, dayEnd)) return null

  const remaining = dayEnd.getTime() - now.getTime()
  const hours   = Math.floor(remaining / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)

  if (hours > 0) return `Осталось ${hours}ч ${minutes}м`
  return `Осталось ${minutes}м`
}

export function lessonStatusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Запланирован',
    completed: 'Проведён',
    cancelled: 'Отменён',
  }
  return map[status] ?? status
}

export function lessonStatusBorderColor(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'border-l-primary-500',
    completed: 'border-l-success-500',
    cancelled: 'border-l-gray-400',
  }
  return map[status] ?? 'border-l-gray-300'
}

export function lessonStatusTextColor(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'text-primary-600',
    completed: 'text-success-700',
    cancelled: 'text-gray-500',
  }
  return map[status] ?? 'text-gray-500'
}

export function lessonStatusBgColor(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-primary-50',
    completed: 'bg-success-50',
    cancelled: 'bg-gray-50',
  }
  return map[status] ?? 'bg-gray-50'
}
