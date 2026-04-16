'use client'
import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDate, formatRelativeDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { Lead, LeadStatus, User, LeadSource, Funnel } from '@/types/crm'

interface Stage { id: string; name: string; color: string }

const statusVariant: Record<LeadStatus, 'active' | 'won' | 'lost'> = {
  active: 'active', won: 'won', lost: 'lost',
}

type SortKey = 'fullName' | 'createdAt' | 'lastActivityAt'

interface LeadTableProps {
  leads: Lead[]
  isLoading?: boolean
  onLeadClick: (id: string) => void
  stages?: Stage[]
  sources?: LeadSource[]
  managers?: User[]
  funnels?: Funnel[]
  showFunnel?: boolean
}

export function LeadTable({
  leads, isLoading, onLeadClick,
  stages = [], sources = [], managers = [], funnels = [],
  showFunnel = false,
}: LeadTableProps) {
  const t = useT()
  const [sortKey, setSortKey]   = useState<SortKey>('createdAt')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')

  // Build lookup maps once
  const stageMap   = useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages])
  const sourceMap  = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])
  const managerMap = useMemo(() => new Map(managers.map((m) => [m.id, m])), [managers])
  const funnelMap  = useMemo(() => new Map(funnels.map((f) => [f.id, f])), [funnels])

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
              <Th label={t('table.fullName')} col="fullName" />
              <Th label={t('table.phone')} />
              <Th label={t('table.source')} />
              {showFunnel && <Th label={t('table.funnel')} />}
              <Th label={t('table.stage')} />
              <Th label={t('table.manager')} />
              <Th label={t('table.status')} />
              <Th label={t('table.created')} col="createdAt" />
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((lead) => {
              const stage   = stageMap.get(lead.stageId ?? '')
              const source  = sourceMap.get(lead.sourceId ?? '')
              const manager = managerMap.get(lead.assignedTo ?? '')
              const funnel  = funnelMap.get(lead.funnelId ?? '')

              return (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onLeadClick(lead.id)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.fullName}</td>
                  <td className="px-4 py-3 text-gray-500">{lead.phone}</td>
                  <td className="px-4 py-3">
                    {source ? <span className="text-gray-600">{source.name}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  {showFunnel && (
                    <td className="px-4 py-3 text-gray-600 text-xs">{funnel?.name ?? '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    {stage ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                        <span className="text-gray-700">{stage.name}</span>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {manager ? (
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={manager.name} src={manager.avatarUrl} size="sm" />
                        <span className="text-gray-600 text-xs truncate max-w-[100px]">{manager.name}</span>
                      </div>
                    ) : <span className="text-xs text-warning-600">{t('table.unassigned')}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[lead.status]}>
                      {t(`lead.status.${lead.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(lead.createdAt)}</td>
                  <td className="px-4 py-3">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 hover:text-primary-500 transition-colors" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">{t('table.noLeads')}</p>
        </div>
      )}
    </div>
  )
}
