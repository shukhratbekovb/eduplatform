import {
  format,
  formatRelative,
  isToday,
  isYesterday,
  parseISO,
  differenceInDays,
} from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: ru })
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy, HH:mm', { locale: ru })
}

export function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'HH:mm', { locale: ru })
}

export function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return `сегодня в ${formatTime(dateStr)}`
  if (isYesterday(date)) return `вчера в ${formatTime(dateStr)}`
  const days = differenceInDays(new Date(), date)
  if (days < 7) return `${days} дн. назад`
  return formatDate(dateStr)
}

export function groupByDate(items: { date: string }[]) {
  const groups: Record<string, typeof items> = {}
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
