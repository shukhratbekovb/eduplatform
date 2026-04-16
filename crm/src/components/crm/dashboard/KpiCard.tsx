'use client'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type CardColor = 'primary' | 'success' | 'warning' | 'danger' | 'info'

interface KpiCardProps {
  label: string
  value: string | number
  delta?: number
  icon: React.ElementType
  color?: CardColor
  loading?: boolean
  suffix?: string
  href?: string
}

const colorMap: Record<CardColor, { icon: string; bg: string; darkBg: string }> = {
  primary: { icon: 'text-primary-600',  bg: 'bg-primary-50',  darkBg: 'dark:bg-primary-900/20' },
  success: { icon: 'text-success-500',  bg: 'bg-success-50',  darkBg: 'dark:bg-green-900/20' },
  warning: { icon: 'text-warning-500',  bg: 'bg-warning-50',  darkBg: 'dark:bg-yellow-900/20' },
  danger:  { icon: 'text-danger-500',   bg: 'bg-danger-50',   darkBg: 'dark:bg-red-900/20' },
  info:    { icon: 'text-info-500',     bg: 'bg-info-50',     darkBg: 'dark:bg-blue-900/20' },
}

export function KpiCard({ label, value, delta, icon: Icon, color = 'primary', loading, suffix, href }: KpiCardProps) {
  const c = colorMap[color]

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  const inner = (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3 transition-shadow',
      href ? 'hover:shadow-md hover:border-primary-300 cursor-pointer' : 'hover:shadow-md',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
        <span className={cn('p-2 rounded-lg', c.bg, c.darkBg)}>
          <Icon className={cn('w-4 h-4', c.icon)} />
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none tabular-nums">
          {value}{suffix}
        </p>

        {delta !== undefined && (
          <DeltaBadge delta={delta} />
        )}
      </div>
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-gray-400">
        <Minus className="w-3 h-3" /> 0%
      </span>
    )
  }
  const up = delta > 0
  return (
    <span className={cn(
      'flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full',
      up ? 'text-success-700 bg-success-50 dark:bg-green-900/30' : 'text-danger-700 bg-danger-50 dark:bg-red-900/30'
    )}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}{delta}%
    </span>
  )
}
