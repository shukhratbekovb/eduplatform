'use client'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useState } from 'react'
import { TaskKanbanColumn } from './TaskKanbanColumn'
import { TaskCard } from './TaskCard'
import { useMoveTask } from '@/lib/hooks/crm/useTasks'
import type { Task, TaskStatus } from '@/types/crm'

const COLUMNS: TaskStatus[] = ['pending', 'in_progress', 'done', 'overdue']

interface TaskKanbanProps {
  tasks: Task[]
  onAddTask: (status?: TaskStatus) => void
  onEditTask: (task: Task) => void
}

export function TaskKanban({ tasks, onAddTask, onEditTask }: TaskKanbanProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const { mutate: moveTask } = useMoveTask()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const grouped = COLUMNS.reduce<Record<TaskStatus, Task[]>>(
    (acc, s) => ({ ...acc, [s]: tasks.filter((t) => t.status === s) }),
    {} as Record<TaskStatus, Task[]>
  )

  const handleDragStart = ({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return

    // Determine target status from column droppable id
    const overId = String(over.id)
    let targetStatus: TaskStatus | null = null

    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '') as TaskStatus
    } else {
      // Dropped on a card — find its column
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask) targetStatus = overTask.status
    }

    const draggedTask = tasks.find((t) => t.id === active.id)
    if (!draggedTask || !targetStatus || targetStatus === draggedTask.status) return
    if (targetStatus === 'overdue') return // Cannot move to overdue manually

    moveTask({ id: draggedTask.id, status: targetStatus })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <TaskKanbanColumn
            key={status}
            status={status}
            tasks={grouped[status]}
            onEdit={onEditTask}
            onAddTask={status !== 'overdue' ? () => onAddTask(status) : undefined}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
        {activeTask && (
          <TaskCard task={activeTask} onEdit={() => {}} isDragOverlay />
        )}
      </DragOverlay>
    </DndContext>
  )
}
