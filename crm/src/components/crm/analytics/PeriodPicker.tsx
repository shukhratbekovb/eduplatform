'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { DatePicker } from '@/components/ui/date-picker'
import { useT } from '@/lib/i18n'
import type { AnalyticsPeriod, AnalyticsPeriodType } from '@/types/crm'

const PRESET_KEYS: { value: AnalyticsPeriodType; key: string }[] = [
  { value: 'today',     key: 'period.today' },
  { value: 'yesterday', key: 'period.yesterday' },
  { value: 'week',      key: 'period.week' },
  { value: 'month',     key: 'period.month' },
  { value: 'custom',    key: 'period.custom' },
]

interface PeriodPickerProps {
  value: AnalyticsPeriod
  onChange: (p: AnalyticsPeriod) => void
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const t = useT()
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
        {PRESET_KEYS.map(({ value: v, key }) => (
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
            {t(key)}
          </button>
        ))}
      </div>

      {/* Custom date range */}
      {(showCustom || value.type === 'custom') && (
        <div className="flex items-center gap-2">
          <DatePicker
            value={value.from ?? ''}
            onChange={(v) => onChange({ type: 'custom', from: v, to: value.to })}
            placeholder="С"
            className="w-44"
          />
          <span className="text-gray-400 text-sm">—</span>
          <DatePicker
            value={value.to ?? ''}
            onChange={(v) => onChange({ type: 'custom', from: value.from, to: v })}
            minDate={value.from}
            placeholder="По"
            className="w-44"
          />
        </div>
      )}
    </div>
  )
}
