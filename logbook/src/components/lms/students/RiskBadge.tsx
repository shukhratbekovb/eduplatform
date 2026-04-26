'use client'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { RiskLevel } from '@/types/lms'

interface RiskBadgeProps {
  level:      RiskLevel
  size?:      'sm' | 'md'
  showLabel?: boolean
  className?: string
}

const styles: Record<string, { dot: string; text: string; bg: string; border: string; labelKey: string }> = {
  low:      { dot: 'bg-success-500',  text: 'text-success-700', bg: 'bg-success-50',   border: 'border-success-200', labelKey: 'risk.normal' },
  normal:   { dot: 'bg-success-500',  text: 'text-success-700', bg: 'bg-success-50',   border: 'border-success-200', labelKey: 'risk.normal' },
  medium:   { dot: 'bg-warning-500',  text: 'text-warning-700', bg: 'bg-warning-50',   border: 'border-warning-200', labelKey: 'risk.atRisk' },
  at_risk:  { dot: 'bg-warning-500',  text: 'text-warning-700', bg: 'bg-warning-50',   border: 'border-warning-200', labelKey: 'risk.atRisk' },
  high:     { dot: 'bg-danger-500',   text: 'text-danger-700',  bg: 'bg-danger-50',    border: 'border-danger-200',  labelKey: 'risk.high' },
  critical: { dot: 'bg-danger-600',   text: 'text-danger-700',  bg: 'bg-danger-50',    border: 'border-danger-200',  labelKey: 'risk.critical' },
}

const fallback = styles.low

export function RiskBadge({ level, size = 'md', showLabel = true, className }: RiskBadgeProps) {
  const t = useT()
  const c = styles[level] ?? fallback
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        c.text, c.bg, c.border,
        className
      )}
    >
      <span
        className={cn(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          c.dot,
          level === 'critical' && 'animate-risk-critical-pulse',
        )}
      />
      {showLabel && t(c.labelKey)}
    </span>
  )
}
