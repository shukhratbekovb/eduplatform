'use client'
import { useState } from 'react'
import { Plus, Kanban } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMupTasks, useMoveMupTask, useCreateMupTask } from '@/lib/hooks/lms/useMupTasks'
import { useCurrentUser } from '@/lib/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { TaskColumn } from '@/components/lms/tasks/TaskColumn'
import { TaskCard } from '@/components/lms/tasks/TaskCard'
import type { MupTask } from '@/types/lms'

const COLUMNS: { id: string; label: string }[] = [
  { id: 'pending',     label: 'К выполнению' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'done',        label: 'Готово' },
]

export default function MupTasksPage() {
  const user = useCurrentUser()
  const { data: tasks = [], isLoading } = useMupTasks({})
  const { mutate: moveTask }            = useMoveMupTask()
  const { mutate: createTask, isPending: creating } = useCreateMupTask()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = (tasks as MupTask[]).filter((t) => t.status === col.id)
    return acc
  }, {} as Record<string, MupTask[]>)

  const activeTask = activeId ? (tasks as MupTask[]).find((t) => t.id === activeId) : null

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return

    const fromStatus = (tasks as MupTask[]).find((t) => t.id === active.id)?.status
    const toStatus   = String(over.id)

    if (fromStatus && toStatus && fromStatus !== toStatus && COLUMNS.some((c) => c.id === toStatus)) {
      moveTask({ id: String(active.id), status: toStatus as MupTask['status'] })
    }
  }

  const handleCreate = () => {
    if (!title.trim()) return
    createTask(
      { title, description: description || undefined, priority: 'medium', assignedTo: user?.id ?? '' },
      {
        onSuccess: () => {
          setTitle('')
          setDesc('')
          setShowForm(false)
        },
      }
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Kanban className="w-5 h-5 text-primary-600" />
          Задачи МУП
        </h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Создать задачу
        </Button>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            {COLUMNS.map((col) => (
              <TaskColumn
                key={col.id}
                id={col.id}
                label={col.label}
                tasks={grouped[col.id] ?? []}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isDragging />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новая задача</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название задачи…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  placeholder="Подробности…"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Отмена</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? 'Создание…' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
