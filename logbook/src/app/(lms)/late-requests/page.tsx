'use client'
import { useState } from 'react'
import { ClockAlert, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useLateRequests, useReviewLateRequest } from '@/lib/hooks/lms/useLateRequests'
import { useIsDirectorOrMup, useCurrentUser } from '@/lib/stores/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

const STATUS_FILTERS = [
  { value: '',           label: 'Все' },
  { value: 'pending',    label: 'Ожидает' },
  { value: 'approved',   label: 'Одобрено' },
  { value: 'rejected',   label: 'Отклонено' },
]

function getStatus(isApproved: boolean | null): 'pending' | 'approved' | 'rejected' {
  if (isApproved === null || isApproved === undefined) return 'pending'
  return isApproved ? 'approved' : 'rejected'
}

const STATUS_CFG = {
  pending:  { label: 'Ожидает',   variant: 'warning' as const },
  approved: { label: 'Одобрено',  variant: 'success' as const },
  rejected: { label: 'Отклонено', variant: 'danger' as const },
}

export default function LateRequestsPage() {
  const canReview = useIsDirectorOrMup()
  const user      = useCurrentUser()

  const [statusFilter, setStatusFilter] = useState<string>('pending')

  const filters = canReview
    ? { status: statusFilter || undefined }
    : { teacherId: user?.id, status: statusFilter || undefined }

  const { data, isLoading } = useLateRequests(filters as any)
  const requests = (data as any)?.data ?? []
  const total    = (data as any)?.total ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ClockAlert className="w-5 h-5 text-warning-600" />
          {canReview ? 'Запросы на позднее внесение' : 'Мои запросы'}
          <span className="text-sm font-normal text-gray-400">({total})</span>
        </h1>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-md mb-5 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-medium transition-colors',
              statusFilter === f.value
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClockAlert}
          title="Нет запросов"
          description={canReview ? 'Все запросы обработаны' : 'У вас нет запросов'}
        />
      ) : (
        <div className="space-y-2">
          {requests.map((req: any) => (
            <LateRequestCard key={req.id} request={req} canReview={canReview} />
          ))}
        </div>
      )}
    </div>
  )
}

function LateRequestCard({ request, canReview }: { request: any; canReview: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const { mutate: review, isPending } = useReviewLateRequest()

  const status = getStatus(request.isApproved)
  const cfg = STATUS_CFG[status]

  const handleApprove = () => review({ id: request.id, data: { approved: true } })
  const handleReject = () => review({ id: request.id, data: { approved: false } })

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div
        className="flex items-start justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <p className="text-sm font-medium text-gray-900">
            {request.teacherName ?? 'Преподаватель'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {request.groupName && `${request.groupName} · `}
            {request.lessonDate ? formatDate(request.lessonDate) : ''}
            {request.lessonTopic && ` · "${request.lessonTopic}"`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">Причина запроса</p>
            <p className="text-sm text-gray-700">{request.reason}</p>
          </div>

          {request.reviewedByName && (
            <p className="text-xs text-gray-400 mb-3">
              {status === 'approved' ? 'Одобрил' : 'Отклонил'}: {request.reviewedByName}
              {request.reviewedAt && ` · ${formatDate(request.reviewedAt)}`}
            </p>
          )}

          {canReview && status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={handleApprove} disabled={isPending} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Одобрить
              </Button>
              <Button size="sm" variant="danger" onClick={handleReject} disabled={isPending} className="flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" />
                Отклонить
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
