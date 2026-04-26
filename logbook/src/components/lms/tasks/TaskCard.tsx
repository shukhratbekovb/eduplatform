'use client'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, User, AlertTriangle, Banknote, BookOpen } from 'lucide-react'
import { useDeleteMupTask } from '@/lib/hooks/lms/useMupTasks'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { MupTask } from '@/types/lms'

const PRIORITY_STYLES: Record<string, { labelKey: string; color: string; bg: string }> = {
  high:   { labelKey: 'tasks.priorityHigh',   color: 'text-danger-700',  bg: 'bg-danger-50 border-danger-200' },
  medium: { labelKey: 'tasks.priorityMedium', color: 'text-warning-700', bg: 'bg-warning-50 border-warning-200' },
  low:    { labelKey: 'tasks.priorityLow',    color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200' },
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  absence_streak:  AlertTriangle,
  payment_overdue: Banknote,
  high_risk:       AlertTriangle,
  homework:        BookOpen,
}

interface TaskCardProps {
  task:       MupTask
  isDragging?: boolean
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const t = useT()
  const { mutate: deleteTask } = useDeleteMupTask()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium
  const CategoryIcon = task.category ? CATEGORY_ICONS[task.category] : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-md border border-gray-200 p-3 group',
        'hover:border-primary-300 hover:shadow-sm transition-all',
        task.priority === 'high' && 'border-l-2 border-l-danger-400',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lesson-drag rotate-1'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {CategoryIcon && <CategoryIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', priority.bg, priority.color)}>
              {t(priority.labelKey)}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 whitespace-pre-line">{task.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {task.studentName && (
              <Link
                href={`/students/${task.studentId}`}
                className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <User className="w-3 h-3" />
                {task.studentName}
              </Link>
            )}
            {task.dueDate && (
              <span className="text-xs text-gray-300">{formatDate(task.dueDate)}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => deleteTask(task.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-danger-500 transition-all shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
