import { cn } from '@/lib/utils/cn'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function Input({ error, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
        'placeholder:text-gray-400',
        'focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
        error ? 'border-danger-500 bg-danger-50' : 'border-gray-200 bg-white',
        className
      )}
      {...props}
    />
  )
}
