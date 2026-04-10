'use client'
import { useState } from 'react'
import { Plus, GitMerge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useFunnels, useCreateFunnel, useArchiveFunnel } from '@/lib/hooks/crm/useFunnels'
import Link from 'next/link'
import type { Funnel as FunnelType } from '@/types/crm'

function FunnelCard({ funnel, onArchive }: { funnel: FunnelType; onArchive: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{funnel.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {funnel.stageCount} эт. · {funnel.leadCount} лидов
          </p>
        </div>
        <Badge variant={funnel.isArchived ? 'default' : 'success'}>
          {funnel.isArchived ? 'Архив' : 'Активна'}
        </Badge>
      </div>
      <div className="flex gap-2 mt-4">
        <Link href={`/settings/funnels/${funnel.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">Настроить</Button>
        </Link>
        {!funnel.isArchived && (
          <Button variant="ghost" size="sm" onClick={onArchive} className="text-danger-600 hover:bg-danger-50">
            Архивировать
          </Button>
        )}
      </div>
    </div>
  )
}

export default function FunnelsPage() {
  const { data: funnels = [], isLoading } = useFunnels()
  const { mutate: createFunnel, isPending: creating } = useCreateFunnel()
  const { mutate: archiveFunnel, isPending: archiving } = useArchiveFunnel()

  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [archiveId,  setArchiveId]  = useState<string | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    createFunnel({ name: newName.trim() }, {
      onSuccess: () => { setShowCreate(false); setNewName('') }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Воронки продаж</h1>
          <p className="text-sm text-gray-500 mt-1">Настройка воронок и этапов</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="md">
          <Plus className="w-4 h-4" />
          Создать воронку
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map((i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : funnels.length === 0 ? (
        <EmptyState
          icon={GitMerge}
          title="Нет воронок"
          description="Создайте первую воронку, чтобы начать работу с лидами."
          action={{ label: '+ Создать воронку', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((funnel) => (
            <FunnelCard
              key={funnel.id}
              funnel={funnel}
              onArchive={() => setArchiveId(funnel.id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Новая воронка</h2>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Название воронки"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowCreate(false); setNewName('') }}>
                Отмена
              </Button>
              <Button onClick={handleCreate} loading={creating} disabled={!newName.trim()}>
                Создать
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={(v) => !v && setArchiveId(null)}
        title="Архивировать воронку?"
        description="Воронка будет скрыта. Лиды в ней сохранятся."
        confirmLabel="Архивировать"
        loading={archiving}
        onConfirm={() => {
          if (archiveId) archiveFunnel(archiveId, { onSuccess: () => setArchiveId(null) })
        }}
      />
    </div>
  )
}
