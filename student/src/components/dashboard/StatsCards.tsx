'use client'
import { CheckSquare, Star, Gem, Clock, AlertTriangle, BookOpen } from 'lucide-react'
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

  const gpa = data?.gpa ?? 0
  const attPct = data?.attendance_percent ?? 0

  const cards = [
    {
      label:  t('dashboard.avgGrade'),
      value:  gpa ? gpa.toFixed(1) : '—',
      sub:    '/ 10',
      icon:   BookOpen,
      color:  'text-primary-600',
      bg:     'bg-primary-50',
    },
    {
      label:  t('dashboard.attendance'),
      value:  attPct ? `${attPct.toFixed(0)}%` : '—',
      sub:    undefined,
      icon:   CheckSquare,
      color:  'text-success-600',
      bg:     'bg-success-50',
    },
    {
      label:  t('dashboard.pending'),
      value:  String(data?.pending_assignments ?? 0),
      sub:    `/ ${data?.total_assignments ?? 0}`,
      icon:   Clock,
      color:  'text-warning-600',
      bg:     'bg-warning-50',
    },
    {
      label:  t('dashboard.onTime'),
      value:  String(data?.on_time_assignments ?? 0),
      sub:    `/ ${data?.total_assignments ?? 0}`,
      icon:   Star,
      color:  'text-info-600',
      bg:     'bg-info-50',
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
