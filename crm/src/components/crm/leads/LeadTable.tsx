'use client'
import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDate, formatRelativeDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { Lead, LeadStatus } from '@/types/crm'

const statusVariant: Record<LeadStatus, 'active' | 'won' | 'lost'> = {
  active: 'active', won: 'won', lost: 'lost',
}
const statusLabel: Record<LeadStatus, string> = {
  active: 'Активный', won: 'Won', lost: 'Lost',
}

type SortKey = 'fullName' | 'createdAt' | 'lastActivityAt'

interface LeadTableProps {
  leads: Lead[]
  isLoading?: boolean
  onLeadClick: (id: string) => void
}

export function LeadTable({ leads, isLoading, onLeadClick }: LeadTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>('createdAt')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...leads].sort((a, b) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    const cmp = String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
  }

  function Th({ label, col, className }: { label: string; col?: SortKey; className?: string }) {
    return (
      <th
        scope="col"
        className={cn('text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide', className)}
      >
        {col ? (
          <button
            onClick={() => toggleSort(col)}
            className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
            aria-sort={sortKey === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
          >
            {label}
            <SortIcon col={col} />
          </button>
        ) : label}
      </th>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 bg-gray-100 rounded flex-1 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-24 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-20 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Список лидов">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <Th label="ФИО"           col="fullName" />
              <Th label="Телефон" />
              <Th label="Источник" />
              <Th label="Этап" />
              <Th label="Менеджер" />
              <Th label="Активность"    col="lastActivityAt" />
              <Th label="Статус" />
              <Th label="Создан"        col="createdAt" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onLeadClick(lead.id)}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{lead.fullName}</td>
                <td className="px-4 py-3 text-gray-500">{lead.phone}</td>
                <td className="px-4 py-3">
                  {lead.source ? (
                    <span className="text-gray-600">{lead.source.name}</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {lead.stage ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lead.stage.color }} />
                      <span className="text-gray-700">{lead.stage.name}</span>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {lead.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name={lead.assignee.name} src={lead.assignee.avatarUrl} size="sm" />
                      <span className="text-gray-600 text-xs truncate max-w-[100px]">{lead.assignee.name}</span>
                    </div>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {lead.lastActivityAt ? formatRelativeDate(lead.lastActivityAt) : '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[lead.status]}>
                    {statusLabel[lead.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(lead.createdAt)}</td>
                <td className="px-4 py-3">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-300 hover:text-primary-500 transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">Нет лидов, соответствующих фильтрам</p>
        </div>
      )}
    </div>
  )
}
