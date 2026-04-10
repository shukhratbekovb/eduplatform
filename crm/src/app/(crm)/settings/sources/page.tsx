'use client'
import { useState } from 'react'
import { Plus, Copy, RefreshCw, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { useSources } from '@/lib/hooks/crm/useLeads'
import type { LeadSourceType } from '@/types/crm'

const typeLabel: Record<LeadSourceType, string> = {
  manual: 'Ручной',
  import: 'CSV',
  api:    'API / Webhook',
}

const typeBadgeVariant: Record<LeadSourceType, 'default' | 'info' | 'primary'> = {
  manual: 'default',
  import: 'info',
  api:    'primary',
}

export default function SourcesPage() {
  const { data: sources = [], isLoading } = useSources()
  const [showCreate, setShowCreate] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Нет источников"
          description="Добавьте источники лидов: ручной ввод, CSV импорт или API."
          action={{ label: '+ Добавить источник', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm" aria-label="Источники лидов">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Название</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Тип</th>
                <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Статус</th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{source.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={typeBadgeVariant[source.type]}>
                      {typeLabel[source.type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${source.isActive ? 'text-success-700' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${source.isActive ? 'bg-success-500' : 'bg-gray-300'}`} />
                      {source.isActive ? 'Активен' : 'Отключён'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {source.type === 'api' && source.webhookUrl && (
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded max-w-xs truncate">
                          {source.webhookUrl}
                        </code>
                        <button
                          onClick={() => copyToClipboard(source.webhookUrl!)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          aria-label="Скопировать URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
