'use client'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { Lesson } from '@/types/lms'

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; labelKey: string }> = {
  scheduled: { dot: 'bg-primary-500',  bg: 'bg-primary-50',  text: 'text-primary-700',  labelKey: 'lesson.scheduled' },
  completed: { dot: 'bg-success-500',  bg: 'bg-success-50',  text: 'text-success-700',  labelKey: 'lesson.conducted' },
  cancelled: { dot: 'bg-gray-400',     bg: 'bg-gray-100',    text: 'text-gray-600',     labelKey: 'lesson.cancelled' },
}

interface LessonStatusBadgeProps {
  status:     Lesson['status'] | string
  className?: string
}

export function LessonStatusBadge({ status, className }: LessonStatusBadgeProps) {
  const t = useT()
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.scheduled
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', cfg.bg, cfg.text, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {t(cfg.labelKey)}
    </span>
  )
}
