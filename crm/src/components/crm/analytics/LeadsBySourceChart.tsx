'use client'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { LeadSourceStat } from '@/types/crm'

const COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#9333EA']

interface LeadsBySourceChartProps {
  data: LeadSourceStat[]
  isLoading?: boolean
}

export function LeadsBySourceChart({ data, isLoading }: LeadsBySourceChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Лиды по источникам</h3>

      {isLoading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="sourceName"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={3}
              label={({ sourceName, percent }) =>
                `${sourceName} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-[260px] animate-pulse">
      <div className="w-44 h-44 rounded-full border-[20px] border-gray-100" />
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
      Нет данных за выбранный период
    </div>
  )
}
