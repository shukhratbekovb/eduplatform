'use client'
import { UserAvatar } from '@/components/ui/avatar'
import { useT } from '@/lib/i18n'
import type { ManagerStat } from '@/types/crm'

interface Props {
  data: ManagerStat[]
  loading?: boolean
}


export function ManagersTable({ data, loading }: Props) {
  const t = useT()

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
        {t('dashboard.widget.noManagers')}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
            <th className="text-left px-4 py-2">{t('managers.name')}</th>
            <th className="text-right px-4 py-2">{t('managers.handled')}</th>
            <th className="text-right px-4 py-2">{t('managers.won')}</th>
            <th className="text-right px-4 py-2">{t('managers.lost')}</th>
            <th className="text-right px-4 py-2">{t('managers.wonRate')}</th>
            <th className="text-right px-4 py-2">{t('managers.avgResponse')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {data.map((m) => (
            <tr key={m.userId} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <UserAvatar name={m.userName} src={m.avatarUrl} size="sm" />
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {m.userName}
                  </span>
                </div>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">
                {m.leadsHandled}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-success-600 dark:text-success-400 font-medium">
                {m.leadsWon}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-danger-500 dark:text-danger-400 font-medium">
                {m.leadsLost}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                <span className={
                  m.wonRate >= 0.5
                    ? 'text-success-500 font-semibold'
                    : 'text-warning-500 font-semibold'
                }>
                  {Math.round(m.wonRate * 100)}%
                </span>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-gray-500 dark:text-gray-400 text-xs">
                {m.avgResponseTimeHours.toFixed(1)} ч
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
