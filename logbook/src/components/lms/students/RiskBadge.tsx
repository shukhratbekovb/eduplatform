import { cn } from '@/lib/utils/cn'
import type { RiskLevel } from '@/types/lms'

interface RiskBadgeProps {
  level:      RiskLevel
  size?:      'sm' | 'md'
  showLabel?: boolean
  className?: string
}

const config: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  low:      { label: 'Норма',    dot: 'bg-success-500',  text: 'text-success-700', bg: 'bg-success-50',   border: 'border-success-200' },
  normal:   { label: 'Норма',    dot: 'bg-success-500',  text: 'text-success-700', bg: 'bg-success-50',   border: 'border-success-200' },
  medium:   { label: 'Риск',     dot: 'bg-warning-500',  text: 'text-warning-700', bg: 'bg-warning-50',   border: 'border-warning-200' },
  at_risk:  { label: 'Риск',     dot: 'bg-warning-500',  text: 'text-warning-700', bg: 'bg-warning-50',   border: 'border-warning-200' },
  high:     { label: 'Высокий',  dot: 'bg-danger-500',   text: 'text-danger-700',  bg: 'bg-danger-50',    border: 'border-danger-200' },
  critical: { label: 'Критично', dot: 'bg-danger-600',   text: 'text-danger-700',  bg: 'bg-danger-50',    border: 'border-danger-200' },
}

const fallback = config.low

export function RiskBadge({ level, size = 'md', showLabel = true, className }: RiskBadgeProps) {
  const c = config[level] ?? fallback
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
      {showLabel && c.label}
    </span>
  )
}
