import { ArrowRight, GitBranch } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/dates'
import { useT } from '@/lib/i18n'
import type { StageChange } from '@/types/crm'

interface TimelineStageChangeProps { change: StageChange }

export function TimelineStageChange({ change }: TimelineStageChangeProps) {
  const t = useT()

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 w-7 h-7 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
        <GitBranch className="w-3.5 h-3.5 text-primary-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-700">
            {t('timeline.movedToStage')}
          </span>
          {change.fromStage && (
            <>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm">
                {change.fromStage.name}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
            </>
          )}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-sm text-white"
            style={{ backgroundColor: change.toStage?.color ?? '#6366F1' }}
          >
            {change.toStage?.name ?? t('timeline.unknownStage')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1.5">
          {change.changedByUser && (
            <span className="text-xs text-gray-400">{change.changedByUser.name}</span>
          )}
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDateTime(change.changedAt)}</span>
        </div>
      </div>
    </div>
  )
}
