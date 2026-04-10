import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default:  'bg-gray-100 text-gray-700 border-gray-200',
        primary:  'bg-primary-100 text-primary-700 border-primary-200',
        success:  'bg-success-50 text-success-700 border-success-500/20',
        warning:  'bg-warning-50 text-warning-700 border-warning-500/20',
        danger:   'bg-danger-50 text-danger-700 border-danger-500/20',
        info:     'bg-info-50 text-info-700 border-info-500/20',
        // Lead statuses
        active:   'bg-info-50 text-info-700 border-info-200',
        won:      'bg-success-50 text-success-700 border-success-200',
        lost:     'bg-danger-50 text-danger-700 border-danger-200',
        // Priority
        low:      'bg-gray-100 text-gray-600 border-gray-200',
        medium:   'bg-info-50 text-info-700 border-info-200',
        high:     'bg-orange-50 text-orange-700 border-orange-200',
        critical: 'bg-danger-50 text-danger-700 border-danger-200',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
