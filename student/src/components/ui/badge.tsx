import { cn } from '@/lib/utils/cn'

type Variant = 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'outline'

interface BadgeProps { children: React.ReactNode; variant?: Variant; className?: string }

const styles: Record<Variant, string> = {
  default:  'bg-gray-100 text-gray-600',
  primary:  'bg-primary-100 text-primary-700',
  success:  'bg-success-50 text-success-700',
  danger:   'bg-danger-50 text-danger-600',
  warning:  'bg-warning-50 text-warning-700',
  info:     'bg-info-50 text-info-600',
  outline:  'border border-gray-200 text-gray-600',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  )
}
