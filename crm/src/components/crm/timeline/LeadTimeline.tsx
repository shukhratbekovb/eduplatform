'use client'
import { useRef, useCallback, useState } from 'react'
import { Plus, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimelineActivity } from './TimelineActivity'
import { TimelineStageChange } from './TimelineStageChange'
import { TimelineComment } from './TimelineComment'
import { ActivityForm } from './ActivityForm'
import { CommentBox } from './CommentBox'
import { useTimeline } from '@/lib/hooks/crm/useLeads'
import { groupByDate } from '@/lib/utils/dates'
import type { TimelineEntry } from '@/types/crm'

interface LeadTimelineProps {
  leadId: string
}

export function LeadTimeline({ leadId }: LeadTimelineProps) {
  const [showActivityForm, setShowActivityForm] = useState(false)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useTimeline(leadId)

  const entries: TimelineEntry[] = data?.pages.flatMap((p) => p.data) ?? []
  const groupedMap = groupByDate(entries)
  const grouped = Object.entries(groupedMap)

  // Infinite scroll sentinel
  const observer = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return
      if (observer.current) observer.current.disconnect()
      if (!node) return
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) fetchNextPage()
      })
      observer.current.observe(node)
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setShowActivityForm((v) => !v)}
          variant={showActivityForm ? 'secondary' : 'primary'}
        >
          <Plus className="w-4 h-4" />
          Записать активность
        </Button>
      </div>

      {/* Activity inline form */}
      {showActivityForm && (
        <ActivityForm leadId={leadId} onClose={() => setShowActivityForm(false)} />
      )}

      {/* Timeline entries */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Нет активностей. Запишите первое взаимодействие.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, items]) => (
            <div key={label}>
              {/* Date divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs font-medium text-gray-400 shrink-0">{label}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-4">
                {items.map((entry) => (
                  <TimelineEntryItem
                    key={`${entry.type}-${getEntryId(entry)}`}
                    entry={entry}
                    leadId={leadId}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Comment box */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Комментарий</span>
        </div>
        <CommentBox leadId={leadId} />
      </div>
    </div>
  )
}

function getEntryId(entry: TimelineEntry): string {
  if (entry.type === 'activity')     return entry.data.id
  if (entry.type === 'stage_change') return entry.data.id
  if (entry.type === 'comment')      return entry.data.id
  return Math.random().toString()
}

function TimelineEntryItem({ entry, leadId }: { entry: TimelineEntry; leadId: string }) {
  if (entry.type === 'activity')          return <TimelineActivity activity={entry.data} />
  if (entry.type === 'stage_change')      return <TimelineStageChange change={entry.data} />
  if (entry.type === 'comment')           return <TimelineComment comment={entry.data} leadId={leadId} />
  if (entry.type === 'assignment_change') return null // Rendered inline as plain text if needed
  return null
}
