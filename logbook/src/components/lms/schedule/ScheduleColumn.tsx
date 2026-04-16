'use client'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { LessonCard } from './LessonCard'
import { isToday, parseISO } from 'date-fns'
import { formatDate, formatWeekdayLong } from '@/lib/utils/dates'
import { compareTimes } from '@/lib/utils/dates'
import type { Lesson } from '@/types/lms'

interface ScheduleColumnProps {
  date:           Date
  lessons:        Lesson[]
  canCreate:      boolean
  onCreateLesson: (date: string) => void
}

export function ScheduleColumn({ date, lessons, canCreate, onCreateLesson }: ScheduleColumnProps) {
  const dateStr   = date.toISOString().split('T')[0]
  const today     = isToday(date)
  const sorted    = [...lessons].sort((a, b) => compareTimes(a.startTime, b.startTime))

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-white overflow-hidden shrink-0',
        'w-[220px] min-h-[400px]',
        today ? 'border-primary-300 shadow-sm' : 'border-gray-200'
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-3 py-2.5 border-b',
        today ? 'bg-primary-50 border-primary-200' : 'bg-gray-50 border-gray-200'
      )}>
        <p className={cn('text-xs font-semibold uppercase tracking-wide', today ? 'text-primary-600' : 'text-gray-500')}>
          {formatWeekdayLong(date)}
        </p>
        <p className={cn('text-sm font-bold mt-0.5', today ? 'text-primary-700' : 'text-gray-900')}>
          {formatDate(date)}
        </p>
        {today && (
          <span className="inline-flex items-center mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full">
            Сегодня
          </span>
        )}
      </div>

      {/* Lessons */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Нет уроков</p>
        ) : (
          sorted.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))
        )}
      </div>

      {/* Add lesson */}
      {canCreate && (
        <div className="px-2 pb-2">
          <button
            onClick={() => onCreateLesson(dateStr)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors border border-dashed border-gray-200 hover:border-primary-300"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить урок
          </button>
        </div>
      )}
    </div>
  )
}
