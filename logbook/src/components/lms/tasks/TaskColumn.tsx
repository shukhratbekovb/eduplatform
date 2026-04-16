import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import type { MupTask } from '@/types/lms'

interface TaskColumnProps {
  id:     string
  label:  string
  tasks:  MupTask[]
}

const COLUMN_STYLES: Record<string, string> = {
  pending:     'border-t-gray-400',
  in_progress: 'border-t-primary-500',
  done:        'border-t-success-500',
}

export function TaskColumn({ id, label, tasks }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border border-gray-200 border-t-4 bg-gray-50 min-h-64 transition-colors ${COLUMN_STYLES[id] ?? 'border-t-gray-300'} ${isOver ? 'bg-primary-50/40' : ''}`}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</span>
        <span className="text-xs text-gray-400 font-medium">{tasks.length}</span>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
