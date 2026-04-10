import { Trophy } from 'lucide-react'
import { UserAvatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import type { ManagerStat } from '@/types/crm'

interface ManagerStatsTableProps {
  data: ManagerStat[]
  isLoading?: boolean
}

export function ManagerStatsTable({ data, isLoading }: ManagerStatsTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Менеджеры</h3>

      {isLoading ? (
        <TableSkeleton />
      ) : data.length === 0 ? (
        <div className="text-center py-10 text-sm text-gray-400">Нет данных</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">#</th>
                <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-4">Менеджер</th>
                <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-4">Лидов</th>
                <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-4">Won</th>
                <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-4">Lost</th>
                <th className="text-right text-xs font-medium text-gray-500 pb-2 pr-4">Конверсия</th>
                <th className="text-right text-xs font-medium text-gray-500 pb-2">Ср. ответ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((m, i) => (
                <tr key={m.userId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-2.5 pr-4">
                    {i === 0 ? (
                      <Trophy className="w-4 h-4 text-warning-500" />
                    ) : (
                      <span className="text-gray-400 font-medium">{i + 1}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={m.userName} src={m.avatarUrl} size="sm" />
                      <span className="font-medium text-gray-900">{m.userName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-right text-gray-700">{m.leadsHandled}</td>
                  <td className="py-2.5 pr-4 text-right text-success-600 font-medium">{m.leadsWon}</td>
                  <td className="py-2.5 pr-4 text-right text-danger-500 font-medium">{m.leadsLost}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <ConversionBadge rate={m.wonRate} />
                  </td>
                  <td className="py-2.5 text-right text-gray-500">
                    {m.avgResponseTimeHours.toFixed(1)} ч
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ConversionBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100)
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
      pct >= 60 ? 'bg-success-50 text-success-700'
      : pct >= 30 ? 'bg-warning-50 text-warning-700'
      : 'bg-danger-50 text-danger-700'
    )}>
      {pct}%
    </span>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-100 rounded w-full" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gray-100 rounded-full" />
          <div className="h-4 bg-gray-100 rounded flex-1" />
          <div className="h-4 bg-gray-100 rounded w-12" />
          <div className="h-4 bg-gray-100 rounded w-12" />
          <div className="h-4 bg-gray-100 rounded w-14" />
          <div className="h-4 bg-gray-100 rounded w-16" />
          <div className="h-4 bg-gray-100 rounded w-12" />
        </div>
      ))}
    </div>
  )
}
