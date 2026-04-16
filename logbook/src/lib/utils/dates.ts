import {
  format,
  formatDistanceToNow,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  startOfWeek,
  addDays,
  differenceInDays,
  isValid,
  parse,
} from 'date-fns'
import { ru } from 'date-fns/locale'

export const LOCALE = ru

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"; const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, 'd MMMM yyyy', { locale: ru }) : '—'
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—"; if (!date) return "—"; const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, 'd MMM', { locale: ru }) : '—'
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—"; if (!date) return "—"; const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, 'd MMM yyyy, HH:mm', { locale: ru }) : '—'
}

export function formatTime(time: string): string {
  // time is "HH:mm"
  return time
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  if (isToday(d))     return `Сегодня в ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Вчера в ${format(d, 'HH:mm')}`
  if (isTomorrow(d))  return `Завтра в ${format(d, 'HH:mm')}`
  return formatDistanceToNow(d, { locale: ru, addSuffix: true })
}

export function formatWeekdayLong(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, 'EEEE', { locale: ru }) : '—'
}

export function formatWeekdayShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return isValid(d) ? format(d, 'EEE', { locale: ru }) : '—'
}

// ── Week navigation ───────────────────────────────────────────────────────────

export function getWeekStart(date?: Date | string): Date {
  const d = date
    ? typeof date === 'string' ? parseISO(date) : date
    : new Date()
  return startOfWeek(d, { weekStartsOn: 1 })
}

export function getWeekDays(weekStartDate: string): Date[] {
  const start = parseISO(weekStartDate)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// ── Lesson window ─────────────────────────────────────────────────────────────

export function isLessonToday(lessonDate: string): boolean {
  return isToday(parseISO(lessonDate))
}

export function formatLessonDate(lessonDate: string): string {
  const d = parseISO(lessonDate)
  if (!isValid(d)) return '—'
  return format(d, 'd MMMM, EEEE', { locale: ru })
}

// ── Period labels ─────────────────────────────────────────────────────────────

export function getPeriodLabel(period: string): string {
  const map: Record<string, string> = {
    today:     'Сегодня',
    yesterday: 'Вчера',
    week:      'Эта неделя',
    month:     'Этот месяц',
    custom:    'Период',
  }
  return map[period] ?? period
}

export function daysUntil(date: string): number {
  return differenceInDays(parseISO(date), new Date())
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

export function compareTimes(a: string, b: string): number {
  const pa = parseTime(a)
  const pb = parseTime(b)
  return pa.hours * 60 + pa.minutes - (pb.hours * 60 + pb.minutes)
}
