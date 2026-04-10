'use client'
import { cn } from '@/lib/utils/cn'

const PRESET_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#64748B',
]

interface StageColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export function StageColorPicker({ value, onChange }: StageColorPickerProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {PRESET_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'w-5 h-5 rounded-full transition-transform hover:scale-110',
            value === color && 'ring-2 ring-offset-1 ring-gray-900 scale-110'
          )}
          style={{ backgroundColor: color }}
          aria-label={color}
          aria-pressed={value === color}
        />
      ))}
    </div>
  )
}
