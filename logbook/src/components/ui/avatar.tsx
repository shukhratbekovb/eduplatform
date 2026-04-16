'use client'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils/cn'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-success-50 text-success-700',
  'bg-warning-50 text-warning-700',
  'bg-danger-50 text-danger-700',
  'bg-info-50 text-info-700',
  'bg-purple-100 text-purple-700',
]

function colorFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
}

interface UserAvatarProps {
  name:    string
  src?:    string | null
  size?:   keyof typeof sizeMap
  className?: string
}

export function UserAvatar({ name, src, size = 'md', className }: UserAvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex shrink-0 overflow-hidden rounded-full', sizeMap[size], className)}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name}
          className="aspect-square h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn('flex h-full w-full items-center justify-center rounded-full font-semibold', colorFor(name))}
      >
        {getInitials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
