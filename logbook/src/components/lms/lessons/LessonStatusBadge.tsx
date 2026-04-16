import { cn } from '@/lib/utils/cn'
import { lessonStatusLabel, lessonStatusTextColor, lessonStatusBgColor } from '@/lib/utils/lessonWindow'
import type { Lesson } from '@/types/lms'

interface LessonStatusBadgeProps {
  status:     Lesson['status']
  className?: string
}

export function LessonStatusBadge({ status, className }: LessonStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        lessonStatusBgColor(status),
        lessonStatusTextColor(status),
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', {
        'bg-primary-500': status === 'scheduled',
        'bg-warning-500 animate-pulse': status === 'in_progress',
        'bg-success-500': status === 'conducted',
        'bg-danger-500':  status === 'incomplete',
        'bg-gray-400':    status === 'cancelled',
      })} />
      {lessonStatusLabel(status)}
    </span>
  )
}
