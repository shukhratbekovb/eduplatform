'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { leadsApi } from '@/lib/api/crm/leads'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { cn } from '@/lib/utils/cn'
import type { Lead } from '@/types/crm'

interface LeadComboboxProps {
  value: string
  onChange: (leadId: string) => void
  placeholder?: string
  error?: boolean
}

export function LeadCombobox({ value, onChange, placeholder = 'Поиск лида…', error }: LeadComboboxProps) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const containerRef          = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  // We need a funnelId for leads — grab from store (may be undefined)
  const activeFunnelId = useCrmStore((s) => s.activeFunnelId)

  const { data: result } = useQuery({
    queryKey: ['crm', 'leads-combobox', activeFunnelId, search],
    queryFn:  () => leadsApi.list({ funnelId: activeFunnelId ?? undefined, limit: 20, search } as any),
    enabled:  open,
    staleTime: 15_000,
  })

  const leads: Lead[] = result?.data ?? []

  // Find currently selected lead to display its name
  const { data: selectedResult } = useQuery({
    queryKey: ['crm', 'lead', value],
    queryFn:  () => leadsApi.get(value),
    enabled:  !!value,
    staleTime: 60_000,
  })
  const selectedLead = selectedResult ?? null

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleOpen = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSelect = (lead: Lead) => {
    onChange(lead.id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center justify-between gap-2 border rounded px-3 py-2 text-sm text-left bg-white transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
          error ? 'border-danger-500' : 'border-gray-300 hover:border-gray-400',
        )}
      >
        <span className={cn('truncate', !selectedLead && 'text-gray-400')}>
          {selectedLead
            ? `${selectedLead.fullName} · ${selectedLead.phone}`
            : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span onClick={handleClear} className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Имя или телефон…"
              className="flex-1 text-sm outline-none placeholder-gray-400"
            />
          </div>

          {/* Results */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {leads.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                {search ? 'Ничего не найдено' : 'Нет лидов'}
              </li>
            ) : (
              leads.map((lead) => (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(lead)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors',
                      lead.id === value && 'bg-primary-50'
                    )}
                  >
                    <p className="text-sm font-medium text-gray-900">{lead.fullName}</p>
                    <p className="text-xs text-gray-500">{lead.phone} · {lead.stage?.name ?? '—'}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
