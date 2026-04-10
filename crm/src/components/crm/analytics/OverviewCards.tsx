import { TrendingUp, TrendingDown, Users, Clock, Trophy, CheckSquare, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { AnalyticsOverview } from '@/types/crm'

interface OverviewCardsProps {
  data: AnalyticsOverview
  isLoading?: boolean
}

export function OverviewCards({ data, isLoading }: OverviewCardsProps) {
  const t = useT()
  if (isLoading) return <OverviewCardsSkeleton />

  const cards = [
    {
      label:   t('analytics.kpi.newLeads'),
      value:   data.newLeads,
      delta:   data.delta.newLeads,
      icon:    Users,
      color:   'text-primary-600',
      bg:      'bg-primary-50',
      format:  (v: number) => String(v),
    },
    {
      label:   t('analytics.kpi.wonLeads'),
      value:   data.wonLeads,
      delta:   data.delta.wonLeads,
      icon:    Trophy,
      color:   'text-success-600',
      bg:      'bg-success-50',
      format:  (v: number) => String(v),
    },
    {
      label:   t('analytics.kpi.avgResponse'),
      value:   data.avgResponseTimeHours,
      delta:   -data.delta.avgResponseTimeHours,
      icon:    Clock,
      color:   'text-warning-600',
      bg:      'bg-warning-50',
      format:  (v: number) => `${v.toFixed(1)} ${t('analytics.kpi.responseUnit')}`,
      inverseDelta: true,
    },
    {
      label:   t('analytics.kpi.tasksCompleted'),
      value:   data.completedTasks,
      delta:   null,
      icon:    CheckSquare,
      color:   'text-info-600',
      bg:      'bg-info-50',
      format:  (v: number) => `${v} / ${data.totalTasks}`,
      sub:     `${data.completedTasksPercent}%`,
    },
    {
      label:   t('analytics.kpi.tasksOverdue'),
      value:   data.overdueTasks,
      delta:   null,
      icon:    AlertCircle,
      color:   data.overdueTasks > 0 ? 'text-danger-600' : 'text-gray-400',
      bg:      data.overdueTasks > 0 ? 'bg-danger-50' : 'bg-gray-50',
      format:  (v: number) => String(v),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        const isPositive = card.delta !== null && card.delta > 0
        const isNegative = card.delta !== null && card.delta < 0

        return (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', card.bg)}>
                <Icon className={cn('w-4.5 h-4.5', card.color)} />
              </div>
              {card.delta !== null && (
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  isPositive ? 'text-success-600' : isNegative ? 'text-danger-500' : 'text-gray-400'
                )}>
                  {isPositive
                    ? <TrendingUp className="w-3 h-3" />
                    : isNegative
                    ? <TrendingDown className="w-3 h-3" />
                    : null}
                  {card.delta > 0 ? '+' : ''}{card.delta.toFixed(0)}%
                </span>
              )}
            </div>

            <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
              {card.format(card.value)}
            </p>
            {card.sub && (
              <p className="text-sm font-medium text-gray-500 mb-1">{card.sub}</p>
            )}
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}

function OverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
          <div className="w-9 h-9 bg-gray-100 rounded-lg mb-3" />
          <div className="h-7 bg-gray-100 rounded w-16 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      ))}
    </div>
  )
}

