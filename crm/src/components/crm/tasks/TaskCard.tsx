'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Trash2, Link2, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate } from '@/lib/utils/dates'
import { useDeleteTask } from '@/lib/hooks/crm/useTasks'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'
import type { Task, TaskPriority } from '@/types/crm'

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  low:      'border-l-info-400',
  medium:   'border-l-warning-400',
  high:     'border-l-danger-400',
  critical: 'border-l-danger-600',
}

const PRIORITY_BADGE_VARIANT: Record<TaskPriority, 'low' | 'medium' | 'high' | 'critical'> = {
  low:      'low',
  medium:   'medium',
  high:     'high',
  critical: 'critical',
}

const PRIORITY_KEY: Record<TaskPriority, string> = {
  low:      'task.priority.low',
  medium:   'task.priority.medium',
  high:     'task.priority.high',
  critical: 'task.priority.critical',
}

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  isDragOverlay?: boolean
}

export function TaskCard({ task, onEdit, isDragOverlay = false }: TaskCardProps) {
  const t = useT()
  const [confirmDel, setConfirmDel] = useState(false)
  const { mutate: deleteTask, isPending: deleting } = useDeleteTask()

  const isOverdue = task.status === 'overdue' || (
    task.status !== 'done' && new Date(task.dueDate) < new Date()
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: task.status === 'overdue',
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'bg-white rounded-lg border border-gray-200 border-l-4 p-3 group',
          'hover:shadow-sm transition-shadow',
          PRIORITY_BORDER[task.priority],
          isDragging && 'opacity-40',
          isDragOverlay && 'shadow-drag rotate-1 scale-105',
        )}
      >
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          {task.status !== 'overdue' && (
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={t("tasks.drag")}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => onEdit(task)}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  aria-label={t("common.edit")}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setConfirmDel(true)}
                  className="p-1 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
            )}

            {/* Metadata row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]} className="text-[10px]">
                {t(PRIORITY_KEY[task.priority])}
              </Badge>

              {task.dueDate && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-[11px]',
                    isOverdue ? 'text-danger-500 font-medium' : 'text-gray-400'
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}

              {task.linkedLead && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Link2 className="w-3 h-3" />
                  <span className="truncate max-w-[100px]">{task.linkedLead.fullName}</span>
                </span>
              )}
            </div>

            {/* Assignee */}
            {task.assignee && (
              <div className="flex items-center gap-1.5 mt-2">
                <UserAvatar name={task.assignee.name} size="sm" />
                <span className="text-[11px] text-gray-400">{task.assignee.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        onOpenChange={setConfirmDel}
        title={t("tasks.delete.title")}
        description={t("tasks.delete.desc")}
        confirmLabel={t("common.delete")}
        destructive
        loading={deleting}
        onConfirm={() =>
          deleteTask(task.id, { onSuccess: () => setConfirmDel(false) })
        }
      />
    </>
  )
}
