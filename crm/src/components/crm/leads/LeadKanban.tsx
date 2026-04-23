'use client'
import { useState, useMemo } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { LeadKanbanColumn } from './LeadKanbanColumn'
import { LeadCard } from './LeadCard'
import { useMoveLeadStage } from '@/lib/hooks/crm/useLeads'
import type { Stage, Lead } from '@/types/crm'

interface LeadKanbanProps {
  stages: Stage[]
  leads: Lead[]
  onLeadClick: (leadId: string) => void
  onAddLead: (stageId: string) => void
  onMarkWon: (leadId: string) => void
  onMarkLost: (leadId: string) => void
}

export function LeadKanban({
  stages, leads, onLeadClick, onAddLead, onMarkWon, onMarkLost,
}: LeadKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { mutate: moveStage }   = useMoveLeadStage()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Group leads by stage (memoized)
  const leadsByStage = useMemo(() => stages.reduce<Record<string, Lead[]>>((acc, stage) => {
    acc[stage.id] = leads.filter((l) => l.stageId === stage.id)
    return acc
  }, {}), [stages, leads])

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return

    const leadId   = active.id as string
    const lead     = leads.find((l) => l.id === leadId)
    if (!lead) return

    // over.id is either a stageId (column) or another leadId (card)
    const overStageId = stages.find((s) => s.id === over.id)?.id
      ?? leads.find((l) => l.id === over.id)?.stageId

    if (overStageId && overStageId !== lead.stageId) {
      moveStage({ leadId, stageId: overStageId })
    }
  }

  const sorted = [...stages].sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {sorted.map((stage) => (
          <LeadKanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage[stage.id] ?? []}
            onAddLead={onAddLead}
            onLeadClick={onLeadClick}
            onMarkWon={onMarkWon}
            onMarkLost={onMarkLost}
          />
        ))}
      </div>

      {/* Drag overlay — renders ghost card while dragging */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
        {activeLead && (
          <LeadCard
            lead={activeLead}
            onClick={() => {}}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
