'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Upload, LayoutGrid, List, Trophy, FileText } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { apiClient } from '@/lib/api/axios'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadKanban } from '@/components/crm/leads/LeadKanban'
import { LeadTable } from '@/components/crm/leads/LeadTable'
import { LeadsFiltersBar } from '@/components/crm/leads/LeadsFiltersBar'
import { LeadForm } from '@/components/crm/leads/LeadForm'
import { CsvImportModal } from '@/components/crm/leads/CsvImportModal'
import { MarkLostDialog } from '@/components/crm/leads/MarkLostDialog'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { useFunnels, useStages } from '@/lib/hooks/crm/useFunnels'
import { useLeads, useSources, useMarkLeadWon, useManagers } from '@/lib/hooks/crm/useLeads'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import type { User } from '@/types/crm'

export default function LeadsPage() {
  const router = useRouter()
  const t = useT()

  const leadsView      = useCrmStore((s) => s.leadsView)
  const setLeadsView   = useCrmStore((s) => s.setLeadsView)
  const activeFunnelId = useCrmStore((s) => s.activeFunnelId)
  const setFunnelId    = useCrmStore((s) => s.setActiveFunnelId)

  const { data: funnels = [], isLoading: funnelsLoading } = useFunnels()
  const activeFunnels   = funnels.filter((f) => !f.isArchived)
  // '' means "all funnels"
  const currentFunnelId = activeFunnelId ?? ''

  const selectedFunnelId = currentFunnelId || undefined  // undefined = all
  const { data: stages  = [] }               = useStages(currentFunnelId || activeFunnels[0]?.id || '')
  const { data: sources = [] }               = useSources()
  const { data: managers = [] }              = useManagers()
  const { data: leadsData, isLoading }       = useLeads(selectedFunnelId)
  const { mutate: markWon }                  = useMarkLeadWon()

  const leads = leadsData?.data ?? []

  // Modals state
  const [createOpen, setCreateOpen]     = useState(false)
  const [csvOpen, setCsvOpen]           = useState(false)
  const [defaultStageId, setDefaultStageId] = useState<string>()
  const [lostLeadId, setLostLeadId]     = useState<string | null>(null)
  const lostLead = lostLeadId ? leads.find((l) => l.id === lostLeadId) : null

  const handleAddLead = (stageId?: string) => {
    setDefaultStageId(stageId)
    setCreateOpen(true)
  }

  const [wonLeadId, setWonLeadId] = useState<string | null>(null)
  const wonLead = wonLeadId ? leads.find(l => l.id === wonLeadId) : null

  const handleMarkWon = (leadId: string) => {
    markWon(leadId, {
      onSuccess: () => setWonLeadId(leadId),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{t('leads.title')}</h1>

          {activeFunnels.length > 0 && (
            <Select value={currentFunnelId || '__all__'} onValueChange={(v) => setFunnelId(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder={t('table.allFunnels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('table.allFunnels')}</SelectItem>
                {activeFunnels.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <Button variant="secondary" size="md" onClick={() => setCsvOpen(true)}>
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
      <LeadsFiltersBar stages={stages} sources={sources} managers={managers} />

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
      ) : leadsView === 'kanban' && currentFunnelId ? (
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
          stages={stages}
          sources={sources}
          managers={managers}
          funnels={activeFunnels}
          showFunnel={!currentFunnelId}
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
        managers={managers}
      />

      <CsvImportModal
        open={csvOpen}
        onOpenChange={setCsvOpen}
        funnels={activeFunnels}
        stages={stages}
      />

      {lostLead && (
        <MarkLostDialog
          open={!!lostLeadId}
          onOpenChange={(v) => !v && setLostLeadId(null)}
          leadId={lostLead.id}
          leadName={lostLead.fullName}
        />
      )}

      {/* Won → Create contract dialog */}
      <Dialog open={!!wonLeadId} onOpenChange={(v) => !v && setWonLeadId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-success-600" />
              {t('contracts.won.title')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            <strong>{wonLead?.fullName}</strong> {t('contracts.won.desc')}
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => {
              const wl = wonLead
              setWonLeadId(null)
              if (wl) {
                apiClient.post('/crm/tasks', {
                  title: `Составить договор: ${wl.fullName}`,
                  description: `Лид ${wl.fullName} (${wl.phone}) выигран. Необходимо составить договор.`,
                  linkedLeadId: wl.id, assignedTo: wl.assignedTo || undefined,
                  dueDate: new Date(Date.now()+86400000).toISOString(), priority: 'high',
                }).then(() => toast.success(t('contracts.won.taskCreated'))).catch(() => {})
              }
            }}>Позже</Button>
            <Button onClick={() => {
              setWonLeadId(null)
              router.push(`/contracts?newContract=1&leadId=${wonLeadId}&fullName=${encodeURIComponent(wonLead?.fullName || '')}&phone=${encodeURIComponent(wonLead?.phone || '')}&email=${encodeURIComponent((wonLead as any)?.email || '')}`)
            }}>
              <FileText className="w-4 h-4" />Создать договор
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
