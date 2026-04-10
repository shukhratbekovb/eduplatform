import { format, formatDistanceToNow, differenceInDays, parseISO, startOfWeek, addDays } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'

export function getLocale(lang: string) {
  return lang === 'ru' ? ru : enUS
}

export function formatDate(date: string, lang = 'ru') {
  return format(parseISO(date), 'd MMMM yyyy', { locale: getLocale(lang) })
}

export function formatShortDate(date: string, lang = 'ru') {
  return format(parseISO(date), 'd MMM', { locale: getLocale(lang) })
}

export function formatMonthYear(date: string, lang = 'ru') {
  return format(parseISO(date), 'LLLL yyyy', { locale: getLocale(lang) })
}

export function formatRelative(date: string, lang = 'ru') {
  return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: getLocale(lang) })
}

export function daysUntil(deadline: string): number {
  return differenceInDays(parseISO(deadline), new Date())
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }) // Monday
}

export function isoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatMoney(amount: number, currency = 'UZS'): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + ' ' + currency
}
