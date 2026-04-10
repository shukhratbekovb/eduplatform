'use client'
import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { StageItem } from './StageItem'
import { StageColorPicker } from './StageColorPicker'
import { Button } from '@/components/ui/button'
import {
  useStages, useCreateStage, useUpdateStage,
  useDeleteStage, useReorderStages,
} from '@/lib/hooks/crm/useFunnels'
import type { Stage } from '@/types/crm'

interface StageListProps { funnelId: string }

export function StageList({ funnelId }: StageListProps) {
  const { data: stages = [], isLoading } = useStages(funnelId)
  const { mutate: createStage, isPending: creating } = useCreateStage(funnelId)
  const { mutate: updateStage }  = useUpdateStage(funnelId)
  const { mutate: deleteStage, isPending: deleting } = useDeleteStage(funnelId)
  const { mutate: reorder }      = useReorderStages(funnelId)

  const [showAdd, setShowAdd]   = useState(false)
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState('#4F46E5')
  const [newProb, setNewProb]   = useState(20)

  const sorted = [...stages].sort((a, b) => a.order - b.order)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const oldIdx = sorted.findIndex((s) => s.id === active.id)
    const newIdx = sorted.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(sorted, oldIdx, newIdx)
    reorder({ orderedIds: reordered.map((s) => s.id) })
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    createStage(
      { name: newName.trim(), color: newColor, winProbability: newProb },
      { onSuccess: () => { setShowAdd(false); setNewName(''); setNewColor('#4F46E5'); setNewProb(20) } }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-md animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {sorted.map((stage) => (
            <StageItem
              key={stage.id}
              stage={stage}
              onUpdate={(id, data) => updateStage({ stageId: id, dto: data })}
              onDelete={(id) => deleteStage(id)}
              isDeleting={deleting}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add Stage form */}
      {showAdd ? (
        <div className="bg-white border border-primary-200 ring-2 ring-primary-100 rounded-md p-4 space-y-3 animate-scale-in">
          <div className="flex items-center gap-3">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowAdd(false) }}
              placeholder="Название этапа"
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            />
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="number"
                value={newProb}
                onChange={(e) => setNewProb(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-14 border border-gray-300 rounded px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-100"
                min={0} max={100}
              />
              <span>%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Цвет</p>
            <StageColorPicker value={newColor} onChange={setNewColor} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Отмена</Button>
            <Button size="sm" onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
              Добавить
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Добавить этап
        </button>
      )}
    </div>
  )
}
