'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import type { FunnelConversionStat } from '@/types/crm'

interface FunnelConversionChartProps {
  data: FunnelConversionStat[]
  isLoading?: boolean
}

export function FunnelConversionChart({ data, isLoading }: FunnelConversionChartProps) {
  const chartData = data.map((d) => ({
    name: d.toStageName,
    rate: Math.round(d.conversionRate * 100),
    leads: d.leadCount,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Конверсия по этапам воронки</h3>

      {isLoading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              unit="%"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === 'rate' ? [`${value}%`, 'Конверсия'] : [value, 'Лидов']
              }
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              cursor={{ fill: '#EEF2FF' }}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.rate >= 70 ? '#059669' : entry.rate >= 40 ? '#4F46E5' : '#F59E0B'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="h-[260px] flex items-end gap-3 px-4 pb-4 animate-pulse">
      {[60, 85, 45, 70, 55].map((h, i) => (
        <div key={i} className="flex-1 bg-gray-100 rounded-t" style={{ height: `${h}%` }} />
      ))}
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
