'use client'
import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal, X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCrmStore, useActiveFiltersCount } from '@/lib/stores/useCrmStore'
import { useIsDirector } from '@/lib/stores/useAuthStore'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import type { Stage, LeadSource, User, LeadStatus } from '@/types/crm'

interface LeadsFiltersBarProps {
  stages: Stage[]
  sources: LeadSource[]
  managers: User[]
}

export function LeadsFiltersBar({ stages, sources, managers }: LeadsFiltersBarProps) {
  const t = useT()
  const [open, setOpen]   = useState(false)
  const searchTimer       = useRef<ReturnType<typeof setTimeout>>()

  const setFilter         = useCrmStore((s) => s.setLeadsFilter)
  const clearFilters      = useCrmStore((s) => s.clearLeadsFilters)
  const filters           = useCrmStore((s) => s.leadsFilters)
  const activeCount       = useActiveFiltersCount()
  const isDirector        = useIsDirector()

  // Debounced search
  const handleSearch = (val: string) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilter('search', val), 300)
  }

  const toggleMulti = <K extends 'stageIds' | 'sourceIds' | 'assignedTo'>(
    key: K, id: string
  ) => {
    const arr = filters[key] as string[]
    setFilter(key, arr.includes(id) ? arr.filter((v) => v !== id) : [...arr, id])
  }

  const toggleStatus = (val: LeadStatus) => {
    const arr = filters.status
    setFilter('status', arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val])
  }

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            defaultValue={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('leads.filter.search')}
            className="pl-9"
          />
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex items-center gap-2 h-10 px-3 rounded border text-sm font-medium transition-colors',
            open || activeCount > 0
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('leads.filter.filters')}
          {activeCount > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-[11px] font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {/* Clear */}
        {activeCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-danger-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {t('leads.filter.reset')}
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {open && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-wrap gap-6 animate-fade-in">
          {/* Stages */}
          {stages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">{t('leads.filter.stage')}</p>
              <div className="flex flex-wrap gap-1.5">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleMulti('stageIds', s.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors',
                      filters.stageIds.includes(s.id)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">{t('leads.filter.source')}</p>
              <div className="flex flex-wrap gap-1.5">
                {sources.filter((s) => s.isActive).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleMulti('sourceIds', s.id)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs border transition-colors',
                      filters.sourceIds.includes(s.id)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">{t('leads.filter.status')}</p>
            <div className="flex gap-1.5">
              {(['active', 'won', 'lost'] as LeadStatus[]).map((val) => (
                <button
                  key={val}
                  onClick={() => toggleStatus(val)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs border transition-colors',
                    filters.status.includes(val)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  {t(`lead.status.${val}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Managers (Director only) */}
          {isDirector && managers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">{t('leads.filter.manager')}</p>
              <div className="flex flex-wrap gap-1.5">
                {managers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMulti('assignedTo', m.id)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs border transition-colors',
                      filters.assignedTo.includes(m.id)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
