'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { LossReasonStat } from '@/types/crm'

interface LossReasonsChartProps {
  data: LossReasonStat[]
  isLoading?: boolean
}

export function LossReasonsChart({ data, isLoading }: LossReasonsChartProps) {
  // Take top 6
  const chartData = data.slice(0, 6).map((d) => ({
    reason: d.reason.length > 22 ? d.reason.slice(0, 22) + '…' : d.reason,
    fullReason: d.reason,
    count:  d.count,
    percent: d.percent,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Причины отказов</h3>

      {isLoading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="reason"
              width={130}
              tick={{ fontSize: 11, fill: '#374151' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: number, _: string, props: any) => [
                `${value} (${props.payload?.percent?.toFixed(0)}%)`,
                props.payload?.fullReason ?? 'Причина',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              cursor={{ fill: '#FEF2F2' }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={`hsl(${0 + i * 15}, 70%, ${55 + i * 3}%)`} />
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
    <div className="space-y-3 px-4 animate-pulse">
      {[80, 60, 45, 35, 25].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 h-3 bg-gray-100 rounded" />
          <div className="h-5 bg-gray-100 rounded" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[260px] text-sm text-gray-400">
      Нет закрытых сделок за выбранный период
    </div>
  )
}
