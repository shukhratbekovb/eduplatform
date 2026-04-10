'use client'
import { CheckSquare, Star, Gem, Clock } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { DashboardData } from '@/types/student'

interface Props { data?: DashboardData; isLoading?: boolean }

export function StatsCards({ data, isLoading }: Props) {
  const t = useT()

  if (isLoading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24 animate-pulse">
          <div className="w-8 h-8 bg-gray-100 rounded-lg mb-3" />
          <div className="h-6 bg-gray-100 rounded w-16 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24" />
        </div>
      ))}
    </div>
  )

  const cards = [
    {
      label:  t('dashboard.pending'),
      value:  String(data?.pendingAssignments ?? 0),
      sub:    `/ ${data?.totalAssignments ?? 0}`,
      icon:   Clock,
      color:  'text-primary-600',
      bg:     'bg-primary-50',
      accent: 'bg-primary-600',
    },
    {
      label:  t('dashboard.onTime'),
      value:  String(data?.onTimeAssignments ?? 0),
      sub:    `/ ${data?.totalAssignments ?? 0}`,
      icon:   CheckSquare,
      color:  'text-success-600',
      bg:     'bg-success-50',
      accent: 'bg-success-600',
    },
    {
      label:  t('dashboard.stars'),
      value:  (data as any)?.student?.stars?.toLocaleString() ?? '1 140',
      sub:    undefined,
      icon:   Star,
      color:  'text-warning-600',
      bg:     'bg-warning-50',
      accent: 'bg-warning-500',
    },
    {
      label:  t('dashboard.crystals'),
      value:  (data as any)?.student?.crystals?.toLocaleString() ?? '543',
      sub:    undefined,
      icon:   Gem,
      color:  'text-info-600',
      bg:     'bg-info-50',
      accent: 'bg-info-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', card.bg)}>
              <Icon className={cn('w-4.5 h-4.5', card.color)} />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {card.value}
              {card.sub && <span className="text-sm font-normal text-gray-400 ml-1">{card.sub}</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        )
      })}
    </div>
  )
}
