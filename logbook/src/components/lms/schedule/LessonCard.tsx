'use client'
import Link from 'next/link'
import { Clock, MapPin, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import { lessonStatusBorderColor, lessonStatusTextColor } from '@/lib/utils/lessonWindow'
import type { Lesson } from '@/types/lms'

interface LessonCardProps {
  lesson:    Lesson
  compact?:  boolean
}

const statusDotColor: Record<string, string> = {
  scheduled: 'bg-primary-500',
  completed: 'bg-success-500',
  cancelled: 'bg-gray-400',
}

const statusKeyMap: Record<string, string> = {
  scheduled: 'lesson.scheduled',
  completed: 'lesson.conducted',
  cancelled: 'lesson.cancelled',
}

export function LessonCard({ lesson, compact }: LessonCardProps) {
  const t = useT()
  const isCancelled = lesson.status === 'cancelled'

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className={cn(
        'block rounded-md border-l-4 bg-white p-3 shadow-xs hover:shadow-lesson transition-all group',
        lessonStatusBorderColor(lesson.status),
        isCancelled && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
          <Clock className="w-3 h-3" />
          {lesson.startTime} – {lesson.endTime}
        </span>
        <span className={cn('w-2 h-2 rounded-full shrink-0', statusDotColor[lesson.status] ?? 'bg-gray-300')} />
      </div>

      <p className="text-sm font-semibold text-gray-900 leading-tight truncate group-hover:text-primary-700 transition-colors">
        {(lesson as any).group?.name ?? ''}
      </p>

      {!compact && lesson.topic && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{lesson.topic}</p>
      )}

      {compact && (
        <p className={cn('text-xs font-medium mt-1', lessonStatusTextColor(lesson.status))}>
          {t(statusKeyMap[lesson.status] ?? lesson.status)}
        </p>
      )}
    </Link>
  )
}
