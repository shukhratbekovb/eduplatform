'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Search, Phone, Mail, User2, Filter,
  LayoutGrid, List, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { leadsApi } from '@/lib/api/crm/leads'
import { useFunnels } from '@/lib/hooks/crm/useFunnels'
import { useSources } from '@/lib/hooks/crm/useLeads'
import { useT } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils/cn'
import { formatDate, formatRelativeDate } from '@/lib/utils/dates'
import type { Lead } from '@/types/crm'

const STATUS_BADGE: Record<string, 'active' | 'won' | 'lost'> = {
  active: 'active',
  won:    'won',
  lost:   'lost',
}

type SortField = 'name' | 'createdAt' | 'lastActivity'
type SortDir   = 'asc' | 'desc'
type ViewMode  = 'table' | 'card'

function sortLeads(leads: Lead[], field: SortField, dir: SortDir): Lead[] {
  return [...leads].sort((a, b) => {
    let cmp = 0
    if (field === 'name') {
      cmp = a.fullName.localeCompare(b.fullName, 'ru')
    } else if (field === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else if (field === 'lastActivity') {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
      cmp = ta - tb
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  if (field !== active) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-primary-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-primary-500" />
}

export default function ContactsPage() {
  const t = useT()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showFilters,  setShowFilters]  = useState(false)
  const [sortField,    setSortField]    = useState<SortField>('createdAt')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')
  const [view,         setView]         = useState<ViewMode>('table')

  const { data: funnels = [] } = useFunnels()
  const { data: sources = [] } = useSources()

  // Fetch leads from all active funnels in parallel, then merge
  const activeFunnelIds = useMemo(
    () => funnels.filter((f) => !f.isArchived).map((f) => f.id),
    [funnels]
  )

  const { data: result, isLoading } = useQuery({
    queryKey: ['crm', 'contacts', activeFunnelIds.join(',')],
    queryFn: async () => {
      if (activeFunnelIds.length === 0) return { data: [] as Lead[] }
      const results = await Promise.all(
        activeFunnelIds.map((id) => leadsApi.list({ funnelId: id, limit: 500 }))
      )
      const seen = new Set<string>()
      const merged: Lead[] = []
      for (const r of results) {
        for (const lead of r.data) {
          if (!seen.has(lead.id)) { seen.add(lead.id); merged.push(lead) }
        }
      }
      return { data: merged }
    },
    enabled: funnels.length > 0,
    staleTime: 30_000,
  })

  const allLeads = result?.data ?? []

  const filtered = useMemo(() => {
    let list = allLeads
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.phone?.includes(q) ||
          l.email?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') list = list.filter((l) => l.status === statusFilter)
    if (sourceFilter !== 'all') list = list.filter((l) => l.sourceId === sourceFilter)
    return sortLeads(list, sortField, sortDir)
  }, [allLeads, search, statusFilter, sourceFilter, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const thClass = (field: SortField) =>
    cn(
      'text-left px-4 py-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors',
      sortField === field && 'text-primary-600 dark:text-primary-400'
    )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('contacts.title')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} контактов</span>
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => setView('table')}
              className={cn(
                'p-2 transition-colors',
                view === 'table'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              title="Таблица"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('card')}
              className={cn(
                'p-2 transition-colors',
                view === 'card'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              title="Карточки"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('contacts.search')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors',
            showFilters
              ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          )}
        >
          <Filter className="w-4 h-4" />
          Фильтры
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('contacts.filter.status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('contact.status.active')}</option>
              <option value="won">{t('contact.status.won')}</option>
              <option value="lost">{t('contact.status.lost')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('contacts.filter.source')}</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">Все</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {/* Sort controls in filter panel (for card view) */}
          {view === 'card' && (
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('contacts.filter.sort')}</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
              >
                <option value="name">{t('contacts.sort.name')}</option>
                <option value="createdAt">{t('contacts.sort.createdAt')}</option>
                <option value="lastActivity">{t('contacts.sort.lastActivity')}</option>
              </select>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {sortDir === 'asc' ? t('contacts.sortDir.asc') : t('contacts.sortDir.desc')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <User2 className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-base font-medium text-gray-500 dark:text-gray-400">
            {search || statusFilter !== 'all' || sourceFilter !== 'all'
              ? t('contacts.emptySearch')
              : t('contacts.empty')}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {search ? t('contacts.emptySearchHint') : t('contacts.emptyHint')}
          </p>
        </div>
      ) : view === 'table' ? (
        /* ── Table view ─────────────────────────────────── */
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className={thClass('name')} onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">
                    {t('contacts.col.name')} <SortIcon field="name" active={sortField} dir={sortDir} />
                  </span>
                </th>
                <th className="text-left px-4 py-3">{t('contacts.col.phone')}</th>
                <th className="text-left px-4 py-3">{t('contacts.col.email')}</th>
                <th className="text-left px-4 py-3">{t('contacts.col.source')}</th>
                <th className="text-left px-4 py-3">{t('contacts.col.status')}</th>
                <th className="text-left px-4 py-3">{t('contacts.col.stage')}</th>
                <th className={thClass('createdAt')} onClick={() => toggleSort('createdAt')}>
                  <span className="flex items-center gap-1">
                    {t('contacts.col.added')} <SortIcon field="createdAt" active={sortField} dir={sortDir} />
                  </span>
                </th>
                <th className={thClass('lastActivity')} onClick={() => toggleSort('lastActivity')}>
                  <span className="flex items-center gap-1">
                    {t('contacts.col.activity')} <SortIcon field="lastActivity" active={sortField} dir={sortDir} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      {lead.fullName}
                    </Link>
                    {lead.assignee && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{lead.assignee.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 truncate max-w-[180px]"
                      >
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {lead.source?.name ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[lead.status] ?? 'active'}>
                      {t(`contact.status.${lead.status}`, lead.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {lead.stage ? (
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded text-white"
                        style={{ backgroundColor: lead.stage.color ?? '#6366F1' }}
                      >
                        {lead.stage.name}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                    {lead.createdAt ? formatDate(lead.createdAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {lead.lastActivityAt ? (
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatRelativeDate(lead.lastActivityAt)}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Card view ──────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <ContactCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}

function ContactCard({ lead }: { lead: Lead }) {
  const t = useT()
  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all"
    >
      {/* Avatar + name */}
      <div className="flex items-start gap-3 mb-3">
        <UserAvatar name={lead.fullName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{lead.fullName}</p>
          {lead.assignee && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{lead.assignee.name}</p>
          )}
        </div>
        <Badge variant={STATUS_BADGE[lead.status] ?? 'active'}>
          {t(`contact.status.${lead.status}`, lead.status)}
        </Badge>
      </div>

      {/* Contact info */}
      <div className="space-y-1.5 text-sm mb-3">
        {lead.phone && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
      </div>

      {/* Footer: stage + last activity */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/60 text-xs">
        <div>
          {lead.stage ? (
            <span
              className="font-medium px-2 py-0.5 rounded text-white"
              style={{ backgroundColor: lead.stage.color ?? '#6366F1' }}
            >
              {lead.stage.name}
            </span>
          ) : lead.source ? (
            <span className="text-gray-500 dark:text-gray-400">{lead.source.name}</span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          )}
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-right">
          {lead.lastActivityAt
            ? formatRelativeDate(lead.lastActivityAt)
            : lead.createdAt
            ? formatDate(lead.createdAt)
            : '—'}
        </span>
      </div>
    </Link>
  )
}
