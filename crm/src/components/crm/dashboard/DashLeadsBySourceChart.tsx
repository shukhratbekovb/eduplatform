'use client'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useThemeStore } from '@/lib/stores/useThemeStore'
import type { LeadSourceStat } from '@/types/crm'

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899']

interface Props {
  data: LeadSourceStat[]
}

export function DashLeadsBySourceChart({ data }: Props) {
  const theme  = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const tooltipBg     = isDark ? '#1F2937' : '#FFFFFF'
  const tooltipBorder = isDark ? '#374151' : '#E5E7EB'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="sourceName"
          cx="50%"
          cy="45%"
          outerRadius={80}
          innerRadius={40}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, name: string) => [`${v} лидов`, name]}
          contentStyle={{
            background: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => <span style={{ color: isDark ? '#D1D5DB' : '#374151' }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
