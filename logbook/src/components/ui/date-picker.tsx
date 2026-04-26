'use client'
import * as React from 'react'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, addYears, subYears, setMonth as setMonthFn, setYear as setYearFn,
  addDays, isSameDay, isSameMonth, isToday, isValid, parseISO, getYear, getMonth,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
  minDate?: string
  maxDate?: string
}

type ViewMode = 'days' | 'months' | 'years'

function toISO(d: Date): string { return format(d, 'yyyy-MM-dd') }

function parseValue(v?: string): Date | null {
  if (!v) return null
  const d = parseISO(v)
  return isValid(d) ? d : null
}

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days: Date[] = []
  let cur = start
  while (cur <= end) { days.push(cur); cur = addDays(cur, 1) }
  return days
}

function getYearRange(centerYear: number): number[] {
  const start = centerYear - 5
  return Array.from({ length: 12 }, (_, i) => start + i)
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ value, onChange, placeholder, disabled, error, className, minDate, maxDate }, ref) => {
    const t = useT()

    const WEEKDAYS = useMemo(() => [
      t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'),
      t('weekday.fri'), t('weekday.sat'), t('weekday.sun'),
    ], [t])

    const MONTH_NAMES = useMemo(() => [
      t('datepicker.jan'), t('datepicker.feb'), t('datepicker.mar'), t('datepicker.apr'),
      t('datepicker.may'), t('datepicker.jun'), t('datepicker.jul'), t('datepicker.aug'),
      t('datepicker.sep'), t('datepicker.oct'), t('datepicker.nov'), t('datepicker.dec'),
    ], [t])

    const [open, setOpen] = useState(false)
    const [viewMonth, setViewMonth] = useState(() => parseValue(value) ?? new Date())
    const [mode, setMode] = useState<ViewMode>('days')

    const containerRef = useRef<HTMLDivElement>(null)
    const selected = parseValue(value)
    const minD = parseValue(minDate)
    const maxD = parseValue(maxDate)

    useEffect(() => {
      if (!open) return
      function handleClick(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
          setMode('days')
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    useEffect(() => {
      const parsed = parseValue(value)
      if (parsed) setViewMonth(parsed)
    }, [value])

    const handleSelectDay = useCallback((day: Date) => {
      onChange?.(toISO(day))
      setOpen(false)
      setMode('days')
    }, [onChange])

    const handleSelectMonth = useCallback((monthIdx: number) => {
      setViewMonth(setMonthFn(viewMonth, monthIdx))
      setMode('days')
    }, [viewMonth])

    const handleSelectYear = useCallback((year: number) => {
      setViewMonth(setYearFn(viewMonth, year))
      setMode('months')
    }, [viewMonth])

    const isDisabledDay = useCallback((day: Date) => {
      if (minD && day < minD) return true
      if (maxD && day > maxD) return true
      return false
    }, [minD, maxD])

    const days = getCalendarDays(viewMonth)
    const currentYear = getYear(viewMonth)
    const currentMonth = getMonth(viewMonth)
    const yearRange = getYearRange(currentYear)

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        {/* Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setOpen(!open); setMode('days') } }}
          className={cn(
            'flex items-center h-10 w-full rounded border bg-white px-3 py-2 text-sm text-left',
            'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
            'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400',
            'transition-colors',
            error
              ? 'border-danger-500 bg-danger-50 focus:ring-danger-100 focus:border-danger-500'
              : 'border-gray-300',
          )}
        >
          <CalendarDays className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
          <span className={cn(selected ? 'text-gray-900' : 'text-gray-400')}>
            {selected ? format(selected, 'd MMMM yyyy', { locale: ru }) : (placeholder ?? t('common.selectDate'))}
          </span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg p-3 w-[280px]">

            {/* ── Days view ─────────────────────────────────────── */}
            {mode === 'days' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button type="button" onClick={() => setMode('months')}
                    className="text-sm font-semibold text-gray-900 hover:text-primary-600 hover:bg-primary-50 px-2 py-0.5 rounded transition-colors capitalize">
                    {format(viewMonth, 'LLLL yyyy', { locale: ru })}
                  </button>
                  <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd} className="text-center text-[10px] font-medium text-gray-400 py-1">{wd}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {days.map((day, i) => {
                    const inMonth = isSameMonth(day, viewMonth)
                    const isSel = selected && isSameDay(day, selected)
                    const isTod = isToday(day)
                    const dis = isDisabledDay(day)
                    return (
                      <button key={i} type="button" disabled={dis}
                        onClick={() => !dis && handleSelectDay(day)}
                        className={cn(
                          'h-8 w-full rounded-md text-xs font-medium transition-colors',
                          'focus:outline-none focus:ring-1 focus:ring-primary-400',
                          dis && 'opacity-30 cursor-not-allowed',
                          !inMonth && !isSel && 'text-gray-300',
                          inMonth && !isSel && !isTod && 'text-gray-700 hover:bg-gray-100',
                          isTod && !isSel && 'bg-gray-100 text-primary-600 font-bold',
                          isSel && 'bg-primary-600 text-white hover:bg-primary-700',
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-gray-100">
                  <button type="button"
                    onClick={() => { const td = new Date(); setViewMonth(td); handleSelectDay(td) }}
                    className="w-full text-xs text-primary-600 hover:text-primary-700 font-medium py-1">
                    {t('common.today')}
                  </button>
                </div>
              </>
            )}

            {/* ── Months view ───────────────────────────────────── */}
            {mode === 'months' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => setViewMonth(subYears(viewMonth, 1))}
                    className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button type="button" onClick={() => setMode('years')}
                    className="text-sm font-semibold text-gray-900 hover:text-primary-600 hover:bg-primary-50 px-2 py-0.5 rounded transition-colors">
                    {currentYear}
                  </button>
                  <button type="button" onClick={() => setViewMonth(addYears(viewMonth, 1))}
                    className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MONTH_NAMES.map((name, idx) => {
                    const isActive = idx === currentMonth
                    const isCurMonth = idx === new Date().getMonth() && currentYear === new Date().getFullYear()
                    return (
                      <button key={idx} type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={cn(
                          'py-2.5 rounded-md text-sm font-medium transition-colors',
                          'focus:outline-none focus:ring-1 focus:ring-primary-400',
                          isActive && 'bg-primary-600 text-white hover:bg-primary-700',
                          !isActive && isCurMonth && 'bg-gray-100 text-primary-600 font-bold hover:bg-gray-200',
                          !isActive && !isCurMonth && 'text-gray-700 hover:bg-gray-100',
                        )}
                      >
                        {name}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── Years view ────────────────────────────────────── */}
            {mode === 'years' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button type="button"
                    onClick={() => setViewMonth(subYears(viewMonth, 12))}
                    className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-semibold text-gray-900">
                    {yearRange[0]} — {yearRange[yearRange.length - 1]}
                  </span>
                  <button type="button"
                    onClick={() => setViewMonth(addYears(viewMonth, 12))}
                    className="p-1 rounded hover:bg-gray-100 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {yearRange.map((yr) => {
                    const isActive = yr === currentYear
                    const isCurYear = yr === new Date().getFullYear()
                    return (
                      <button key={yr} type="button"
                        onClick={() => handleSelectYear(yr)}
                        className={cn(
                          'py-2.5 rounded-md text-sm font-medium transition-colors',
                          'focus:outline-none focus:ring-1 focus:ring-primary-400',
                          isActive && 'bg-primary-600 text-white hover:bg-primary-700',
                          !isActive && isCurYear && 'bg-gray-100 text-primary-600 font-bold hover:bg-gray-200',
                          !isActive && !isCurYear && 'text-gray-700 hover:bg-gray-100',
                        )}
                      >
                        {yr}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  }
)
DatePicker.displayName = 'DatePicker'

export { DatePicker }
export type { DatePickerProps }
