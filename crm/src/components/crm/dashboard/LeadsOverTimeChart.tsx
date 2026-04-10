'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ru as ruLocale } from 'date-fns/locale'
import { useT } from '@/lib/i18n'
import { useThemeStore } from '@/lib/stores/useThemeStore'
import type { LeadsOverTimeStat } from '@/types/crm'

interface Props {
  data: LeadsOverTimeStat[]
}

export function LeadsOverTimeChart({ data }: Props) {
  const t     = useT()
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'd MMM', { locale: ruLocale }),
  }))

  const gridColor   = isDark ? '#374151' : '#F3F4F6'
  const tickColor   = isDark ? '#9CA3AF' : '#6B7280'
  const tooltipBg   = isDark ? '#1F2937' : '#FFFFFF'
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: tickColor }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: isDark ? '#F9FAFB' : '#111827', fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="newLeads"
          name={t('dashboard.chart.newLeads')}
          stroke="#6366F1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="wonLeads"
          name={t('dashboard.chart.wonLeads')}
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
