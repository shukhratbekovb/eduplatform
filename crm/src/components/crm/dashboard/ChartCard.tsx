'use client'
import { useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { PeriodPicker } from '@/components/crm/analytics/PeriodPicker'
import { useT } from '@/lib/i18n'
import type { ChartFilters, ChartDirectorContext } from './types'
import type { Funnel, User } from '@/types/crm'

interface ChartCardProps {
  title: string
  /** Render prop — called with current filters (dashboard or modal-local) */
  children: (filters: ChartFilters) => React.ReactNode
  /** Filters from the parent dashboard (used in the main card) */
  dashboardFilters: ChartFilters
  /** Pass to enable per-chart filter controls inside the modal */
  directorCtx?: {
    funnels: Funnel[]
    managers: User[]
  }
  /** Which filter controls to show inside the modal */
  modalFilters?: Array<'period' | 'funnel' | 'manager'>
  className?: string
}

/** Modal filter bar — rendered only inside the expanded modal */
function ModalFilterBar({
  filters,
  onChange,
  show,
  funnels,
  managers,
  t,
}: {
  filters: ChartFilters
  onChange: (f: ChartFilters) => void
  show: Array<'period' | 'funnel' | 'manager'>
  funnels?: Funnel[]
  managers?: User[]
  t: (k: string) => string
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
      {show.includes('period') && (
        <PeriodPicker
          value={filters.period}
          onChange={(period) => onChange({ ...filters, period })}
        />
      )}

      {show.includes('funnel') && funnels && funnels.length > 0 && (
        <select
          value={filters.funnelId ?? ''}
          onChange={(e) => onChange({ ...filters, funnelId: e.target.value || undefined })}
          className="border border-gray-200 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('dashboard.filter.allFunnels')}</option>
          {funnels.filter((f) => !f.isArchived).map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      {show.includes('manager') && managers && managers.length > 0 && (
        <select
          value={filters.managerId ?? ''}
          onChange={(e) => onChange({ ...filters, managerId: e.target.value || undefined })}
          className="border border-gray-200 dark:border-gray-600 rounded px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('dashboard.filter.allManagers')}</option>
          {managers.filter((m) => m.role === 'sales_manager').map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  )
}

/**
 * Expandable chart wrapper.
 *
 * - Main card: renders `children(dashboardFilters)` — inherits page-level filters.
 * - Modal: has its own local filter state (initialised from dashboardFilters).
 *   Filter controls are shown inside the modal based on `modalFilters` prop.
 */
export function ChartCard({
  title,
  children,
  dashboardFilters,
  directorCtx,
  modalFilters = ['period'],
  className,
}: ChartCardProps) {
  const t = useT()

  const [expanded, setExpanded] = useState(false)
  // Modal gets its own independent copy of filters
  const [localFilters, setLocalFilters] = useState<ChartFilters>(dashboardFilters)

  // Reset local filters to current dashboard values when modal opens
  const handleOpen = () => {
    setLocalFilters(dashboardFilters)
    setExpanded(true)
  }

  return (
    <>
      {/* ── Main card ──────────────────────────────────────────────────── */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col ${className ?? ''}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
          <button
            onClick={handleOpen}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('common.expand')}
            title={t('common.expand')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 p-4">
          {children(dashboardFilters)}
        </div>
      </div>

      {/* ── Expanded modal with independent filter state ────────────────── */}
      <Dialog.Root open={expanded} onOpenChange={(v) => !v && setExpanded(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-fade-in" />
          <Dialog.Content
            className="fixed inset-4 md:inset-8 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col animate-scale-in overflow-hidden"
            aria-describedby={undefined}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </Dialog.Title>
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body: filters + chart */}
            <div className="flex-1 p-6 overflow-auto flex flex-col">
              {modalFilters.length > 0 && (
                <ModalFilterBar
                  filters={localFilters}
                  onChange={setLocalFilters}
                  show={modalFilters}
                  funnels={directorCtx?.funnels}
                  managers={directorCtx?.managers}
                  t={t}
                />
              )}

              <div className="flex-1 min-h-[400px]">
                {children(localFilters)}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
