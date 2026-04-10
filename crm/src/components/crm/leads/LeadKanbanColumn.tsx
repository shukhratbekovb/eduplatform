'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils/cn'
import type { Stage, Lead } from '@/types/crm'

interface LeadKanbanColumnProps {
  stage: Stage
  leads: Lead[]
  onAddLead: (stageId: string) => void
  onLeadClick: (leadId: string) => void
  onMarkWon: (leadId: string) => void
  onMarkLost: (leadId: string) => void
}

export function LeadKanbanColumn({
  stage, leads, onAddLead, onLeadClick, onMarkWon, onMarkLost,
}: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stage } })

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold text-gray-900">{stage.name}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        </div>
        <button
          onClick={() => onAddLead(stage.id)}
          className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
          aria-label={`Добавить лид в ${stage.name}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-32 rounded-lg p-2 space-y-2 transition-colors',
          isOver
            ? 'bg-primary-50 ring-2 ring-primary-300 ring-dashed'
            : 'bg-gray-100/60'
        )}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead.id)}
              onMarkWon={() => onMarkWon(lead.id)}
              onMarkLost={() => onMarkLost(lead.id)}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <button
            onClick={() => onAddLead(stage.id)}
            className="w-full py-4 text-xs text-gray-400 hover:text-primary-500 text-center border border-dashed border-gray-200 hover:border-primary-300 rounded-md transition-colors"
          >
            + Добавить лид
          </button>
        )}
      </div>
    </div>
  )
}
