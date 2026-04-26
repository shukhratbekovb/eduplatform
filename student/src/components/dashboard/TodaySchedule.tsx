'use client'
import { CalendarDays, Clock, BookOpen, UserCheck, MapPin } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { Lesson } from '@/types/student'

interface Props {
  lessons: Lesson[]
  isLoading?: boolean
}

export function TodaySchedule({ lessons, isLoading }: Props) {
  const t = useT()
  const sorted = [...lessons].sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-semibold text-gray-700">
          {t('dashboard.todaySchedule')}
        </h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
          <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">{t('dashboard.noLessonsToday')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((lesson) => {
            const now = new Date()
            const [startH, startM] = lesson.startTime.split(':').map(Number)
            const [endH, endM] = lesson.endTime.split(':').map(Number)
            const startMin = startH * 60 + startM
            const endMin = endH * 60 + endM
            const nowMin = now.getHours() * 60 + now.getMinutes()
            const isNow = nowMin >= startMin && nowMin < endMin
            const isPast = nowMin >= endMin

            return (
              <div
                key={lesson.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isNow ? 'border-primary-300 bg-primary-50' :
                  isPast ? 'border-gray-100 bg-gray-50 opacity-60' :
                  'border-gray-200 bg-white'
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded',
                      isNow ? 'bg-primary-100 text-primary-700' :
                      isPast ? 'bg-gray-100 text-gray-500' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      <Clock className="w-3 h-3" />
                      {lesson.startTime} – {lesson.endTime}
                    </div>
                    {isNow && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                        {t('dashboard.now')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <BookOpen className="w-3 h-3 text-gray-400 shrink-0" />
                  <p className="text-sm font-medium text-gray-900 truncate">{lesson.subjectName || lesson.groupNumber}</p>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  {lesson.teacherName && (
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{lesson.teacherName}</span>
                    </div>
                  )}
                  {lesson.room && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{lesson.room}</span>
                    </div>
                  )}
                  {lesson.isOnline && (
                    <span className="text-xs text-blue-500 font-medium">Online</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
