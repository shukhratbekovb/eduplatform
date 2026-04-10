'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, MoreVertical, Trophy, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { formatRelativeDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { Lead, LeadStatus } from '@/types/crm'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const statusBorder: Record<LeadStatus, string> = {
  active: '',
  won:    'border-l-4 border-l-success-500',
  lost:   'border-l-4 border-l-danger-500',
}

interface LeadCardProps {
  lead: Lead
  onClick: () => void
  onMarkWon?: () => void
  onMarkLost?: () => void
  overlay?: boolean
}

export function LeadCard({ lead, onClick, onMarkWon, onMarkLost, overlay }: LeadCardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: lead.id, data: { lead } })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'bg-white border border-gray-200 rounded-md p-3 select-none',
        'hover:shadow-md hover:border-gray-300 transition-all duration-150',
        statusBorder[lead.status],
        isDragging && 'opacity-40',
        overlay && 'shadow-drag rotate-1 scale-105 cursor-grabbing',
        lead.status === 'lost' && 'opacity-70'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <button
          className="flex-1 text-left"
          onClick={(e) => { e.stopPropagation(); onClick() }}
        >
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">
            {lead.fullName}
          </p>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 text-gray-300 hover:text-gray-400 touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
              <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
              <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
            </svg>
          </button>

          {/* Context menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="p-0.5 text-gray-300 hover:text-gray-500 rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
                aria-label="Действия"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="min-w-36 bg-white rounded-md shadow-md border border-gray-200 py-1 z-50 text-sm"
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item
                  onSelect={() => onClick()}
                  className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
                >
                  Открыть
                </DropdownMenu.Item>
                {lead.status === 'active' && onMarkWon && (
                  <DropdownMenu.Item
                    onSelect={onMarkWon}
                    className="flex items-center gap-2 px-3 py-2 text-success-700 hover:bg-success-50 cursor-pointer outline-none"
                  >
                    <Trophy className="w-3.5 h-3.5" /> Won
                  </DropdownMenu.Item>
                )}
                {lead.status === 'active' && onMarkLost && (
                  <DropdownMenu.Item
                    onSelect={onMarkLost}
                    className="flex items-center gap-2 px-3 py-2 text-danger-600 hover:bg-danger-50 cursor-pointer outline-none"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Lost
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Phone */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
        <Phone className="w-3 h-3 shrink-0" />
        <span>{lead.phone}</span>
      </div>

      {/* Source badge */}
      {lead.source && (
        <div className="mb-3">
          <Badge variant="default" className="text-[11px]">{lead.source.name}</Badge>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        {lead.assignee ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <UserAvatar name={lead.assignee.name} src={lead.assignee.avatarUrl} size="sm" />
            <span className="truncate max-w-[80px]">{lead.assignee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300">Не назначен</span>
        )}
        {lead.lastActivityAt && (
          <span className="text-[11px] text-gray-300 shrink-0">
            {formatRelativeDate(lead.lastActivityAt)}
          </span>
        )}
      </div>
    </div>
  )
}
