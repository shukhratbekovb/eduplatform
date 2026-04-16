'use client'
import { useState } from 'react'
import { Plus, LayoutGrid, Calendar, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { TaskKanban } from '@/components/crm/tasks/TaskKanban'
import { TaskForm } from '@/components/crm/tasks/TaskForm'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { useIsDirector } from '@/lib/stores/useAuthStore'
import { useTasks } from '@/lib/hooks/crm/useTasks'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { Task, TaskStatus } from '@/types/crm'

export default function TasksPage() {
  const t            = useT()
  const tasksView    = useCrmStore((s) => s.tasksView)
  const setTasksView = useCrmStore((s) => s.setTasksView)
  const showAll      = useCrmStore((s) => s.showAllManagersTasks)
  const setShowAll   = useCrmStore((s) => s.setShowAllManagersTasks)
  const isDirector   = useIsDirector()

  const { data: tasks = [], isLoading } = useTasks()

  const [formOpen, setFormOpen]               = useState(false)
  const [editingTask, setEditingTask]         = useState<Task | undefined>()
  const [defaultStatus, setDefaultStatus]    = useState<TaskStatus | undefined>()

  const handleAddTask = (status?: TaskStatus) => {
    setEditingTask(undefined)
    setDefaultStatus(status)
    setFormOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setDefaultStatus(undefined)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
          {isDirector && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="w-4 h-4 accent-primary-600 cursor-pointer"
              />
              <span className="text-sm text-gray-600">{t('tasks.allManagers')}</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setTasksView('kanban')}
              className={cn(
                'p-2 transition-colors',
                tasksView === 'kanban' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              )}
              aria-label="Kanban"
              aria-pressed={tasksView === 'kanban'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTasksView('calendar')}
              className={cn(
                'p-2 transition-colors',
                tasksView === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
              )}
              aria-label={t('tasks.calendar')}
              aria-pressed={tasksView === 'calendar'}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          <Button size="md" onClick={() => handleAddTask()}>
            <Plus className="w-4 h-4" />
            {t('tasks.addTask')}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t('tasks.empty')}
          description={t('tasks.emptyHint')}
          action={{ label: t('tasks.emptyAdd'), onClick: () => handleAddTask() }}
        />
      ) : tasksView === 'kanban' ? (
        <TaskKanban
          tasks={tasks}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-400 text-center py-8">
            {t('tasks.calendarHint')}
          </p>
        </div>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
      />
    </div>
  )
}
