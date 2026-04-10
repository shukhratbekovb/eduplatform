'use client'
import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { AnalyticsPeriod, AnalyticsPeriodType } from '@/types/crm'

const PRESETS: { value: AnalyticsPeriodType; label: string }[] = [
  { value: 'today',     label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: 'week',      label: 'Неделя' },
  { value: 'month',     label: 'Месяц' },
  { value: 'custom',    label: 'Период' },
]

interface PeriodPickerProps {
  value: AnalyticsPeriod
  onChange: (p: AnalyticsPeriod) => void
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const [showCustom, setShowCustom] = useState(value.type === 'custom')

  const handlePreset = (type: AnalyticsPeriodType) => {
    if (type === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onChange({ type })
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Preset buttons */}
      <div className="flex items-center border border-gray-200 rounded overflow-hidden">
        {PRESETS.map(({ value: v, label }) => (
          <button
            key={v}
            onClick={() => handlePreset(v)}
            className={cn(
              'px-3 py-1.5 text-sm transition-colors',
              value.type === v
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {(showCustom || value.type === 'custom') && (
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="date"
            value={value.from ?? ''}
            onChange={(e) => onChange({ type: 'custom', from: e.target.value, to: value.to })}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={value.to ?? ''}
            min={value.from}
            onChange={(e) => onChange({ type: 'custom', from: value.from, to: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
        </div>
      )}
    </div>
  )
}
