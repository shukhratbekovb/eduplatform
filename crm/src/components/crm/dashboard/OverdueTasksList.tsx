'use client'
import { AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale'
import { useT } from '@/lib/i18n'
import type { Task } from '@/types/crm'

interface Props {
  tasks: Task[]
  loading?: boolean
}

export function OverdueTasksList({ tasks, loading }: Props) {
  const t = useT()
  const overdue = tasks.filter((t) => t.status === 'overdue')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
        {overdue.length > 0 && <AlertTriangle className="w-4 h-4 text-danger-500 shrink-0" />}
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t('dashboard.widget.overdueTasks')}
          {overdue.length > 0 && (
            <span className="ml-2 text-xs font-normal bg-danger-50 dark:bg-red-900/30 text-danger-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
              {overdue.length}
            </span>
          )}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-gray-50 dark:divide-gray-700/50">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : overdue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <AlertTriangle className="w-8 h-8 text-gray-200 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">{t('dashboard.widget.noOverdue')}</p>
          </div>
        ) : (
          overdue.map((task) => (
            <div key={task.id} className="flex items-start gap-3 px-5 py-3">
              <span className="w-2 h-2 rounded-full bg-danger-500 shrink-0 mt-1.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                <p className="text-xs text-danger-500 dark:text-red-400 mt-0.5">
                  {t('task.dueDate')}: {format(new Date(task.dueDate), 'd MMM', { locale: ruLocale })}
                </p>
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
