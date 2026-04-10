'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Upload, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadKanban } from '@/components/crm/leads/LeadKanban'
import { LeadTable } from '@/components/crm/leads/LeadTable'
import { LeadsFiltersBar } from '@/components/crm/leads/LeadsFiltersBar'
import { LeadForm } from '@/components/crm/leads/LeadForm'
import { MarkLostDialog } from '@/components/crm/leads/MarkLostDialog'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { useFunnels, useStages } from '@/lib/hooks/crm/useFunnels'
import { useLeads, useSources, useMarkLeadWon } from '@/lib/hooks/crm/useLeads'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import type { User } from '@/types/crm'

// Temporary empty managers list — will come from /api/users when backend is ready
const MOCK_MANAGERS: User[] = []

export default function LeadsPage() {
  const router = useRouter()
  const t = useT()

  const leadsView      = useCrmStore((s) => s.leadsView)
  const setLeadsView   = useCrmStore((s) => s.setLeadsView)
  const activeFunnelId = useCrmStore((s) => s.activeFunnelId)
  const setFunnelId    = useCrmStore((s) => s.setActiveFunnelId)

  const { data: funnels = [], isLoading: funnelsLoading } = useFunnels()
  const activeFunnels   = funnels.filter((f) => !f.isArchived)
  const currentFunnelId = activeFunnelId || activeFunnels[0]?.id || ''

  const { data: stages  = [] }               = useStages(currentFunnelId)
  const { data: sources = [] }               = useSources()
  const { data: leadsData, isLoading }       = useLeads(currentFunnelId)
  const { mutate: markWon }                  = useMarkLeadWon()

  const leads = leadsData?.data ?? []

  // Modals state
  const [createOpen, setCreateOpen]     = useState(false)
  const [defaultStageId, setDefaultStageId] = useState<string>()
  const [lostLeadId, setLostLeadId]     = useState<string | null>(null)
  const lostLead = lostLeadId ? leads.find((l) => l.id === lostLeadId) : null

  const handleAddLead = (stageId?: string) => {
    setDefaultStageId(stageId)
    setCreateOpen(true)
  }

  const handleMarkWon = (leadId: string) => {
    markWon(leadId, {
      onSuccess: () => toast.success(t('leads.toast.won')),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{t('leads.title')}</h1>

          {activeFunnels.length > 0 && (
            <select
              value={currentFunnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
            >
              {activeFunnels.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-gray-200 rounded overflow-hidden">
            {(['kanban', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setLeadsView(v)}
                className={cn(
                  'p-2 transition-colors',
                  leadsView === v ? 'bg-primary-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                )}
                aria-label={v === 'kanban' ? 'Kanban' : t('common.search')}
                aria-pressed={leadsView === v}
              >
                {v === 'kanban' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </button>
            ))}
          </div>

          <Button variant="secondary" size="md">
            <Upload className="w-4 h-4" />
            {t('leads.importCsv')}
          </Button>

          <Button size="md" onClick={() => handleAddLead()}>
            <Plus className="w-4 h-4" />
            {t('leads.addLead')}
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <LeadsFiltersBar stages={stages} sources={sources} managers={MOCK_MANAGERS} />

      {/* ── Content ─────────────────────────────────────────── */}
      {funnelsLoading || isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : activeFunnels.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('leads.empty.noFunnels')}
          description={t('leads.empty.noFunnelsHint')}
        />
      ) : leadsView === 'kanban' ? (
        <LeadKanban
          stages={stages}
          leads={leads}
          onLeadClick={(id) => router.push(`/leads/${id}`)}
          onAddLead={handleAddLead}
          onMarkWon={handleMarkWon}
          onMarkLost={(id) => setLostLeadId(id)}
        />
      ) : (
        <LeadTable
          leads={leads}
          isLoading={isLoading}
          onLeadClick={(id) => router.push(`/leads/${id}`)}
        />
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      <LeadForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStageId={defaultStageId}
        defaultFunnelId={currentFunnelId}
        funnels={activeFunnels}
        stages={stages}
        sources={sources}
        managers={MOCK_MANAGERS}
      />

      {lostLead && (
        <MarkLostDialog
          open={!!lostLeadId}
          onOpenChange={(v) => !v && setLostLeadId(null)}
          leadId={lostLead.id}
          leadName={lostLead.fullName}
        />
      )}
    </div>
  )
}
