'use client'
import { CheckSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { Task, TaskPriority } from '@/types/crm'

interface Props {
  tasks: Task[]
  loading?: boolean
  onAddTask?: () => void
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low:      'bg-gray-400',
  medium:   'bg-info-500',
  high:     'bg-warning-500',
  critical: 'bg-danger-500',
}

export function TodayTasksList({ tasks, loading, onAddTask }: Props) {
  const t = useT()

  const todayStr = new Date().toISOString().split('T')[0]
  const todayTasks = tasks.filter((task) => {
    const due = task.dueDate?.split('T')[0]
    return due === todayStr && task.status !== 'done'
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('dashboard.widget.todayTasks')}
          {todayTasks.length > 0 && (
            <span className="ml-2 text-xs font-normal bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full">
              {todayTasks.length}
            </span>
          )}
        </h3>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            title={t('common.create')}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-gray-50 dark:divide-gray-700/50">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <CheckSquare className="w-8 h-8 text-gray-200 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.widget.noTasks')}</p>
          </div>
        ) : (
          todayTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-5 py-3">
              <span className={cn('w-2 h-2 rounded-full shrink-0', PRIORITY_DOT[task.priority])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                {task.linkedLead && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{task.linkedLead.fullName}</p>
                )}
              </div>
              {task.assignee && (
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{task.assignee.name.split(' ')[0]}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
