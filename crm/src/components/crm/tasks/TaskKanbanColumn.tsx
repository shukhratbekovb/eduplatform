'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { TaskCard } from './TaskCard'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { Task, TaskStatus } from '@/types/crm'

const COLUMN_STYLE: Record<TaskStatus, { titleKey: string; header: string; dot: string }> = {
  pending:     { titleKey: 'task.status.pending',     header: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-400' },
  in_progress: { titleKey: 'task.status.in_progress', header: 'bg-info-50 border-info-200',   dot: 'bg-info-500' },
  done:        { titleKey: 'task.status.done',        header: 'bg-success-50 border-success-200', dot: 'bg-success-500' },
  overdue:     { titleKey: 'task.status.overdue',     header: 'bg-danger-50 border-danger-200', dot: 'bg-danger-500' },
}

interface TaskKanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onEdit: (task: Task) => void
  onAddTask?: () => void
}

export function TaskKanbanColumn({ status, tasks, onEdit, onAddTask }: TaskKanbanColumnProps) {
  const t = useT()
  const meta = COLUMN_STYLE[status]
  const isReadOnly = status === 'overdue'

  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    disabled: isReadOnly,
  })

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Column header */}
      <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-lg border border-b-0', meta.header)}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', meta.dot)} />
          <span className="text-sm font-semibold text-gray-700">{t(meta.titleKey)}</span>
          <span className="text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        {onAddTask && !isReadOnly && (
          <button
            onClick={onAddTask}
            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-white/80 rounded transition-colors"
            aria-label={t('tasks.addTaskBtn')}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 p-2 rounded-b-lg border border-gray-200 min-h-[200px] transition-colors',
          isOver && !isReadOnly && 'bg-primary-50/50 ring-2 ring-primary-200 ring-dashed',
          isReadOnly && 'bg-danger-50/30',
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-gray-300">
            {isReadOnly ? t('tasks.noOverdue') : t('tasks.noTasks')}
          </div>
        )}
      </div>
    </div>
  )
}
