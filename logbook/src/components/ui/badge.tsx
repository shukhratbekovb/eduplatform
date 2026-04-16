import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default:  'bg-gray-100 text-gray-700',
        primary:  'bg-primary-100 text-primary-700',
        success:  'bg-success-50 text-success-700',
        warning:  'bg-warning-50 text-warning-700',
        danger:   'bg-danger-50 text-danger-700',
        info:     'bg-info-50 text-info-700',
        outline:  'border border-gray-300 text-gray-600',
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
