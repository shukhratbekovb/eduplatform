'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useThemeStore } from '@/lib/stores/useThemeStore'
import type { FunnelConversionStat } from '@/types/crm'

interface Props {
  data: FunnelConversionStat[]
}

export function DashFunnelConvChart({ data }: Props) {
  const theme  = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const gridColor     = isDark ? '#374151' : '#F3F4F6'
  const tickColor     = isDark ? '#9CA3AF' : '#6B7280'
  const tooltipBg     = isDark ? '#1F2937' : '#FFFFFF'
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB'

  const chartData = data
    .filter((d) => d.toStageName)
    .map((d) => ({
      stage: d.toStageName,
      rate: Math.round(d.conversionRate * 100),
    }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="stage"
          tick={{ fontSize: 11, fill: tickColor }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: tickColor }}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          formatter={(v: number) => [`${v}%`, 'Конверсия']}
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {chartData.map((_, i) => {
            const opacity = 1 - i * 0.12
            return <Cell key={i} fill={`rgba(99,102,241,${Math.max(opacity, 0.3)})`} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
