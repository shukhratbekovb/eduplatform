'use client'
import { useState } from 'react'
import { Plus, Copy, Check, Radio, Link2, Globe, FileSpreadsheet, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { useSources, useCreateSource, useDeleteSource } from '@/lib/hooks/crm/useLeads'
import { useFunnels } from '@/lib/hooks/crm/useFunnels'
import type { LeadSourceType, LeadSource } from '@/types/crm'
import type { CreateSourceDto } from '@/types/crm/api'

const typeLabel: Record<LeadSourceType, string> = {
  manual:  'Ручной',
  import:  'CSV',
  api:     'API',
  landing: 'Лендинг',
}

const typeBadgeVariant: Record<LeadSourceType, 'default' | 'info' | 'primary' | 'warning'> = {
  manual:  'default',
  import:  'info',
  api:     'primary',
  landing: 'warning',
}

const typeIcon: Record<LeadSourceType, React.ElementType> = {
  manual:  Pencil,
  import:  FileSpreadsheet,
  api:     Link2,
  landing: Globe,
}

export default function SourcesPage() {
  const { data: sources = [], isLoading } = useSources()
  const { data: funnels = [] } = useFunnels()
  const createSource = useCreateSource()
  const deleteSource = useDeleteSource()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreateSourceDto>({ name: '', type: 'manual' })
  const [copied, setCopied] = useState<string | null>(null)

  const activeFunnels = funnels.filter((f) => !f.isArchived)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    toast.success(`${label} скопировано`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Введите название'); return }
    if ((form.type === 'api' || form.type === 'landing') && !form.funnelId) {
      toast.error('Выберите воронку для API/Лендинг источника')
      return
    }
    createSource.mutate(form, {
      onSuccess: () => {
        setShowCreate(false)
        setForm({ name: '', type: 'manual' })
      },
    })
  }

  const getEndpointUrl = (source: LeadSource) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
    if (source.type === 'api') return `${base}/public/api/${source.apiKey}/leads`
    if (source.type === 'landing') return `${base}/public/forms/${source.apiKey}`
    return null
  }

  const getFunnelName = (funnelId?: string) => {
    if (!funnelId) return null
    return funnels.find((f) => f.id === funnelId)?.name ?? null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Источники лидов</h1>
          <p className="text-sm text-gray-500 mt-1">Откуда приходят лиды в систему</p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="md">
          <Plus className="w-4 h-4" />
          Добавить источник
        </Button>
      </div>

      {/* ── Create form ──────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Новый источник</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Название</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Telegram Bot, Google Ads..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип</label>
              <select
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as LeadSourceType })}
              >
                <option value="manual">Ручной</option>
                <option value="import">CSV</option>
                <option value="api">API</option>
                <option value="landing">Лендинг</option>
              </select>
            </div>
            {(form.type === 'api' || form.type === 'landing') && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ворон��а</label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  value={form.funnelId || ''}
                  onChange={(e) => setForm({ ...form, funnelId: e.target.value || undefined })}
                >
                  <option value="">Выберите воронку...</option>
                  {activeFunnels.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} loading={createSource.isPending}>
              Создать
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setForm({ name: '', type: 'manual' }) }}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* ── Sources list ─���───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Нет источников"
          description="Добавьте источники лидов: ручной ввод, CSV импорт, API или лендинг."
          action={{ label: '+ Добавить источник', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const Icon = typeIcon[source.type]
            const endpoint = getEndpointUrl(source)
            const funnelName = getFunnelName(source.funnelId)

            return (
              <div key={source.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{source.name}</h3>
                      {funnelName && (
                        <span className="text-xs text-gray-400">Воронка: {funnelName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={typeBadgeVariant[source.type]}>
                      {typeLabel[source.type]}
                    </Badge>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${source.isActive ? 'text-success-700' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${source.isActive ? 'bg-success-500' : 'bg-gray-300'}`} />
                      {source.isActive ? 'Активен' : 'Отключён'}
                    </span>
                  </div>
                </div>

                {/* Endpoint URL for api/landing */}
                {endpoint && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                          {source.type === 'api' ? 'API Endpoint' : 'Form Config URL'}
                        </span>
                        <code className="block text-xs text-gray-600 mt-1 truncate">{endpoint}</code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(endpoint, 'URL')}
                        className="shrink-0 p-1.5 rounded hover:bg-gray-200 transition-colors"
                      >
                        {copied === endpoint ? (
                          <Check className="w-3.5 h-3.5 text-success-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {source.type === 'api' && (
                      <div className="mt-2 text-[11px] text-gray-400">
                        POST JSON: <code className="bg-gray-100 px-1 rounded">{'{ "fullName": "...", "phone": "...", "email": "..." }'}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
