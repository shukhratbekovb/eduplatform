import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded border bg-white px-3 py-2 text-sm text-gray-900',
        'placeholder:text-gray-400',
        'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
        'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400',
        'transition-colors',
        error
          ? 'border-danger-500 bg-danger-50 focus:ring-danger-100 focus:border-danger-500'
          : 'border-gray-300',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
