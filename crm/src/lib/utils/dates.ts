import {
  format,
  formatRelative,
  isToday,
  isYesterday,
  parseISO,
  differenceInDays,
} from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'd MMM yyyy', { locale: ru }) }
  catch { return '—' }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'd MMM yyyy, HH:mm', { locale: ru }) }
  catch { return '—' }
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try { return format(parseISO(dateStr), 'HH:mm', { locale: ru }) }
  catch { return '—' }
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return `сегодня в ${formatTime(dateStr)}`
  if (isYesterday(date)) return `вчера в ${formatTime(dateStr)}`
  const days = differenceInDays(new Date(), date)
  if (days < 7) return `${days} дн. назад`
  return formatDate(dateStr)
}

export function groupByDate<T extends { date: string }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const date = parseISO(item.date)
    let key: string
    if (isToday(date)) key = 'Сегодня'
    else if (isYesterday(date)) key = 'Вчера'
    else key = format(date, 'd MMMM yyyy', { locale: ru })
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}
