import { Phone, Users, MessageSquare, Activity as ActivityIcon, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDateTime } from '@/lib/utils/dates'
import { useT } from '@/lib/i18n'
import type { Activity, ActivityType } from '@/types/crm'

const ACTIVITY_META: Record<ActivityType, { icon: React.ElementType; key: string; color: string }> = {
  call:    { icon: Phone,         key: 'activity.type.call',    color: 'text-info-600' },
  meeting: { icon: Users,         key: 'activity.type.meeting', color: 'text-success-600' },
  message: { icon: MessageSquare, key: 'activity.type.message', color: 'text-warning-600' },
  other:   { icon: ActivityIcon,  key: 'activity.type.other',   color: 'text-gray-400' },
}

interface TimelineActivityProps { activity: Activity }

export function TimelineActivity({ activity }: TimelineActivityProps) {
  const t = useT()
  const meta = ACTIVITY_META[activity.type]
  const Icon = meta.icon

  return (
    <div className="flex gap-3">
      {/* Icon */}
      <div className={`mt-0.5 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 ${meta.color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900">{t(meta.key)}</span>
          {activity.channel && (
            <Badge variant="default" className="text-[11px]">{activity.channel}</Badge>
          )}
          {activity.durationMinutes && (
            <span className="text-xs text-gray-400">{activity.durationMinutes} {t('timeline.min')}</span>
          )}
          {activity.needsFollowUp && (
            <Badge variant="warning" className="text-[11px]">Follow-up</Badge>
          )}
        </div>

        <p className="text-sm text-gray-700 mt-1">{activity.outcome}</p>

        {activity.notes && (
          <p className="text-sm text-gray-500 mt-1 italic">{activity.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          {activity.createdByUser && (
            <div className="flex items-center gap-1.5">
              <UserAvatar name={activity.createdByUser.name} size="sm" />
              <span className="text-xs text-gray-400">{activity.createdByUser.name}</span>
            </div>
          )}
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDateTime(activity.date)}</span>
        </div>
      </div>
    </div>
  )
}
