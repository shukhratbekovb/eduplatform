'use client'
import { useState } from 'react'
import { Plus, GitMerge, Radio, Copy, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SourceForm } from '@/components/crm/settings/SourceForm'
import { useFunnels, useCreateFunnel, useArchiveFunnel } from '@/lib/hooks/crm/useFunnels'
import {
  useSources, useCreateSource, useUpdateSource, useDeleteSource,
} from '@/lib/hooks/crm/useLeads'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import type { Funnel, LeadSource, LeadSourceType } from '@/types/crm'

const typeBadge: Record<LeadSourceType, 'default' | 'info' | 'primary'> = {
  manual: 'default',
  import: 'info',
  api:    'primary',
}

type Tab = 'funnels' | 'sources'

// ── Funnels tab ───────────────────────────────────────────────────────────────

function FunnelCard({ funnel, onArchive }: { funnel: Funnel; onArchive: () => void }) {
  const t = useT()
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{funnel.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {funnel.stageCount} эт. · {funnel.leadCount} лидов
          </p>
        </div>
        <Badge variant={funnel.isArchived ? 'default' : 'success'}>
          {funnel.isArchived ? t('settings.funnels.status.archived') : t('settings.funnels.status.active')}
        </Badge>
      </div>
      <div className="flex gap-2 mt-4">
        <Link href={`/settings/funnels/${funnel.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">{t('settings.funnels.configure')}</Button>
        </Link>
        {!funnel.isArchived && (
          <Button variant="ghost" size="sm" onClick={onArchive} className="text-danger-600 hover:bg-danger-50">
            {t('settings.funnels.archive')}
          </Button>
        )}
      </div>
    </div>
  )
}

function FunnelsTab() {
  const t = useT()
  const { data: funnels = [], isLoading } = useFunnels()
  const { mutate: createFunnel, isPending: creating } = useCreateFunnel()
  const { mutate: archiveFunnel, isPending: archiving } = useArchiveFunnel()
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [archiveId,  setArchiveId]  = useState<string | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    createFunnel({ name: newName.trim() }, {
      onSuccess: () => { setShowCreate(false); setNewName('') },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('settings.funnels.subtitle')}</p>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />{t('settings.funnels.createBtn')}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-36 bg-gray-100 rounded-lg animate-pulse" />)}
        </div>
      ) : funnels.length === 0 ? (
        <EmptyState
          icon={GitMerge} title={t('settings.funnels.empty.title')}
          description={t('settings.funnels.empty.desc')}
          action={{ label: `+ ${t('settings.funnels.createBtn')}`, onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((f) => (
            <FunnelCard key={f.id} funnel={f} onArchive={() => setArchiveId(f.id)} />
          ))}
        </div>
      )}

      {/* Create inline modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.funnels.createModal.title')}</h2>
            <input
              autoFocus value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={t('settings.funnels.createModal.placeholder')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowCreate(false); setNewName('') }}>{t('common.cancel')}</Button>
              <Button onClick={handleCreate} loading={creating} disabled={!newName.trim()}>{t('common.create')}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={(v) => !v && setArchiveId(null)}
        title={t('settings.funnels.archiveConfirm.title')}
        description={t('settings.funnels.archiveConfirm.desc')}
        confirmLabel={t('settings.funnels.archiveConfirm.btn')}
        loading={archiving}
        onConfirm={() => { if (archiveId) archiveFunnel(archiveId, { onSuccess: () => setArchiveId(null) }) }}
      />
    </div>
  )
}

// ── Sources tab ───────────────────────────────────────────────────────────────

function SourcesTab() {
  const t = useT()
  const { data: sources = [], isLoading } = useSources()
  const { mutate: createSource, isPending: creating } = useCreateSource()
  const { mutate: updateSource, isPending: updating } = useUpdateSource()
  const { mutate: deleteSource, isPending: deleting } = useDeleteSource()

  const [formOpen,     setFormOpen]     = useState(false)
  const [editSource,   setEditSource]   = useState<LeadSource | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<LeadSource | null>(null)

  const openCreate = () => { setEditSource(undefined); setFormOpen(true) }
  const openEdit   = (s: LeadSource) => { setEditSource(s); setFormOpen(true) }

  const handleSave = (values: { name: string; type: LeadSourceType }) => {
    if (editSource) {
      updateSource(
        { id: editSource.id, dto: { name: values.name } },
        { onSuccess: () => setFormOpen(false) }
      )
    } else {
      createSource(
        { name: values.name, type: values.type },
        { onSuccess: () => setFormOpen(false) }
      )
    }
  }

  const toggleActive = (s: LeadSource) => {
    updateSource({ id: s.id, dto: { isActive: !s.isActive } })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(t('settings.copied'))
  }

  const typeLabel: Record<LeadSourceType, string> = {
    manual: t('settings.source.type.manual'),
    import: t('settings.source.type.import'),
    api:    t('settings.source.type.api'),
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('settings.sources.subtitle')}</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />{t('settings.sources.addBtn')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={Radio} title={t('settings.sources.empty.title')}
          description={t('settings.sources.empty.desc')}
          action={{ label: `+ ${t('settings.sources.addBtn')}`, onClick: openCreate }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">{t('settings.sources.col.name')}</th>
                <th className="text-left px-4 py-3">{t('settings.sources.col.type')}</th>
                <th className="text-left px-4 py-3">{t('settings.sources.col.webhook')}</th>
                <th className="text-left px-4 py-3">{t('settings.sources.col.status')}</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50/60 transition-colors group">
                  <td className="px-4 py-3 font-medium text-gray-900">{source.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={typeBadge[source.type]}>{typeLabel[source.type]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {source.type === 'api' && source.webhookUrl ? (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-[220px] truncate block">
                          {source.webhookUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(source.webhookUrl!)}
                          className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                          aria-label={t('settings.sources.copy')}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(source)}
                      disabled={updating}
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                      aria-label={source.isActive ? t('settings.sources.toggleDisable') : t('settings.sources.toggleEnable')}
                    >
                      {source.isActive
                        ? <ToggleRight className="w-5 h-5 text-success-500" />
                        : <ToggleLeft  className="w-5 h-5 text-gray-300" />}
                      <span className={source.isActive ? 'text-success-700' : 'text-gray-400'}>
                        {source.isActive ? t('settings.sources.status.active') : t('settings.sources.status.inactive')}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <button
                        onClick={() => openEdit(source)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        aria-label={t('common.edit')}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(source)}
                        className="p-1.5 text-gray-400 hover:text-danger-500 hover:bg-danger-50 rounded transition-colors"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SourceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        source={editSource}
        onSave={handleSave}
        isPending={creating || updating}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t('settings.sources.deleteTitle')}
        description={`${t('settings.sources.deleteDescStart')}${deleteTarget?.name}${t('settings.sources.deleteDescEnd')}`}
        confirmLabel={t('common.delete')}
        destructive
        loading={deleting}
        onConfirm={() => {
          if (deleteTarget) deleteSource(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('funnels')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200">
        {([
          { value: 'funnels', labelKey: 'settings.tab.funnels' },
          { value: 'sources', labelKey: 'settings.tab.sources' },
        ] as const).map(({ value, labelKey }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === value
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === 'funnels' ? <FunnelsTab /> : <SourcesTab />}
    </div>
  )
}
