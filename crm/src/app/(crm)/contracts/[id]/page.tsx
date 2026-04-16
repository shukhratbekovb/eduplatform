'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileText, User, Phone, Mail, Calendar, CreditCard, Upload, BookOpen, Hash, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/dates'
import { useT } from '@/lib/i18n'

const DOC_TYPE_KEYS: Record<string, string> = {
  passport: 'Passport',
  birth_certificate: 'Birth Certificate',
  photo: 'Photo 3x4',
  other: 'Other',
}
const DOC_VALUES = ['passport', 'birth_certificate', 'photo', 'other']

interface Doc { id: string; type: string; typeLabel: string; fileName: string; fileUrl: string; uploadedAt?: string }
interface Contract {
  id: string; contractNumber?: string; fullName: string; phone: string; email?: string
  directionId?: string; directionName?: string
  paymentType: string; paymentTypeLabel?: string; paymentAmount?: number; currency: string
  durationMonths?: number; totalLessons?: number; startDate?: string; notes?: string
  status: string; createdAt?: string; studentId?: string; studentCode?: string
  createdByName?: string; hasDocuments?: boolean; documents?: Doc[]
}

export default function ContractDetailPage() {
  const params = useParams(); const id = params?.id as string ?? ''
  const router = useRouter()
  const t = useT()
  const { data: contract, isLoading, refetch } = useQuery<Contract>({
    queryKey: ['crm', 'contracts', id],
    queryFn: () => apiClient.get(`/crm/contracts/${id}`).then(r => r.data),
    enabled: !!id,
  })

  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('passport')

  if (isLoading || !contract) {
    return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
  }

  const uploadDoc = async (file: File) => {
    if (!contract.studentId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('doc_type', docType)
      await apiClient.post(`/crm/contracts/students/${contract.studentId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(t('misc.uploaded'))
      refetch()
    } catch { toast.error('Upload error') }
    finally { setUploading(false) }
  }

  const docs = contract.documents ?? []
  const uploadedTypes = new Set(docs.map(d => d.type))

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />Назад
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{contract.fullName}</h1>
              <Badge variant={contract.status === 'active' ? 'success' : 'default'}>
                {contract.status === 'active' ? t('contracts.status.active') : contract.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Hash className="w-3.5 h-3.5" />
              <span className="font-mono font-semibold text-primary-700">{contract.contractNumber}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{contract.paymentAmount?.toLocaleString()} {contract.currency}</p>
            <p className="text-xs text-gray-400">{contract.paymentTypeLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Info icon={BookOpen} label="Направление" value={contract.directionName ?? '—'} />
          <Info icon={Calendar} label="Длительность" value={contract.durationMonths ? `${contract.durationMonths} мес. · ${contract.totalLessons} уроков` : '—'} />
          <Info icon={Calendar} label="Дата начала" value={formatDate(contract.startDate)} />
          <Info icon={Phone} label="Телефон" value={contract.phone} />
          <Info icon={Mail} label="Email" value={contract.email ?? '—'} />
          <Info icon={UserCheck} label="Код студента" value={contract.studentCode ?? '—'} />
          <Info icon={User} label="Создал" value={contract.createdByName ?? '—'} />
          <Info icon={Calendar} label="Дата создания" value={formatDate(contract.createdAt)} />
        </div>

        {contract.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Примечания</p>
            <p className="text-sm text-gray-700">{contract.notes}</p>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />Документы студента
        </h2>

        {docs.length > 0 ? (
          <div className="space-y-2 mb-4">
            {docs.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.typeLabel}</p>
                  <p className="text-xs text-gray-400">{d.fileName}</p>
                </div>
                <Badge variant="success">Загружен</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">Документы не загружены</p>
        )}

        {contract.studentId && (
          <div className="flex gap-2 items-end border-t pt-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Тип документа</label>
              <select className="w-full h-9 border border-gray-200 rounded px-2 text-sm" value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_VALUES.map(dv => (
                  <option key={dv} value={dv} disabled={uploadedTypes.has(dv)}>
                    {DOC_TYPE_KEYS[dv]}{uploadedTypes.has(dv) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>
            <label className={`flex items-center gap-1.5 px-3 h-9 rounded border text-sm font-medium cursor-pointer transition-colors ${uploading ? 'opacity-50' : 'border-primary-300 text-primary-700 hover:bg-primary-50'}`}>
              <Upload className="w-3.5 h-3.5" />Загрузить
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = '' }} disabled={uploading} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
