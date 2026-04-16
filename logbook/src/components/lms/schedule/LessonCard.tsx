'use client'
import Link from 'next/link'
import { Clock, MapPin, Users, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { lessonStatusBorderColor, lessonStatusLabel, lessonStatusTextColor, lessonStatusBgColor } from '@/lib/utils/lessonWindow'
import type { Lesson } from '@/types/lms'

interface LessonCardProps {
  lesson:    Lesson
  compact?:  boolean
}

const statusDotColor: Record<Lesson['status'], string> = {
  scheduled:   'bg-primary-500',
  in_progress: 'bg-warning-500',
  conducted:   'bg-success-500',
  incomplete:  'bg-danger-500',
  cancelled:   'bg-gray-400',
}

export function LessonCard({ lesson, compact }: LessonCardProps) {
  const isInProgress = lesson.status === 'in_progress'
  const isCancelled  = lesson.status === 'cancelled'

  return (
    <Link
      href={`/lessons/${lesson.id}`}
      className={cn(
        'block rounded-md border-l-4 bg-white p-3 shadow-xs hover:shadow-lesson transition-all group',
        lessonStatusBorderColor(lesson.status),
        lessonStatusBgColor(lesson.status) + '/30',
        isCancelled && 'opacity-60',
        isInProgress && 'animate-lesson-inprogress',
      )}
    >
      {/* Header: time + status dot */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
          <Clock className="w-3 h-3" />
          {lesson.startTime} – {lesson.endTime}
        </span>
        <span className={cn('w-2 h-2 rounded-full shrink-0', statusDotColor[lesson.status], isInProgress && 'animate-risk-critical-pulse')} />
      </div>

      {/* Group name */}
      <p className="text-sm font-semibold text-gray-900 leading-tight truncate group-hover:text-primary-700 transition-colors">
        {lesson.group.name}
      </p>

      {/* Topic */}
      {!compact && lesson.topic && (
        <p className="text-xs text-gray-500 mt-0.5 truncate">{lesson.topic}</p>
      )}

      {/* Meta: room + teacher */}
      {!compact && (
        <div className="flex items-center gap-3 mt-2">
          {lesson.room && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              {lesson.room.name}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" />
            {lesson.teacher.name.split(' ')[0]}
          </span>
        </div>
      )}

      {/* Incomplete warning */}
      {lesson.status === 'incomplete' && (
        <div className="flex items-center gap-1 mt-2 text-xs text-danger-600 font-medium">
          <AlertTriangle className="w-3 h-3" />
          Данные не внесены
        </div>
      )}

      {/* Status badge (compact) */}
      {compact && (
        <p className={cn('text-xs font-medium mt-1', lessonStatusTextColor(lesson.status))}>
          {lessonStatusLabel(lesson.status)}
        </p>
      )}
    </Link>
  )
}
