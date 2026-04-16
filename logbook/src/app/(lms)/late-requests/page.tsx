'use client'
import { useState } from 'react'
import { ClockAlert, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useLateRequests, useReviewLateRequest } from '@/lib/hooks/lms/useLateRequests'
import { useIsDirectorOrMup, useCurrentUser } from '@/lib/stores/useAuthStore'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { LateEntryRequest } from '@/types/lms'

const STATUS_FILTERS = [
  { value: '',           label: 'Все' },
  { value: 'pending',    label: 'Ожидает' },
  { value: 'approved',   label: 'Одобрено' },
  { value: 'rejected',   label: 'Отклонено' },
]

export default function LateRequestsPage() {
  const canReview  = useIsDirectorOrMup()
  const user       = useCurrentUser()

  const [statusFilter, setStatusFilter] = useState<string>('pending')

  const filters = canReview
    ? { status: statusFilter || undefined }
    : { teacherId: user?.id, status: statusFilter || undefined }

  const { data, isLoading } = useLateRequests(filters as any)
  const requests = (data as any)?.data ?? []
  const total    = (data as any)?.total ?? 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ClockAlert className="w-5 h-5 text-warning-600" />
          {canReview ? 'Запросы на позднее внесение' : 'Мои запросы'}
          <span className="text-sm font-normal text-gray-400">({total})</span>
        </h1>
      </div>

      {/* Status filter */}
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

      {/* Content */}
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
          description={canReview ? 'Все запросы обработаны' : 'У вас нет запросов на позднее внесение'}
        />
      ) : (
        <div className="space-y-2">
          {requests.map((req: LateEntryRequest) => (
            <LateRequestCard key={req.id} request={req} canReview={canReview} />
          ))}
        </div>
      )}
    </div>
  )
}

function LateRequestCard({ request, canReview }: { request: LateEntryRequest; canReview: boolean }) {
  const [expanded, setExpanded]     = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const { mutate: review, isPending } = useReviewLateRequest()

  const statusConfig = {
    pending:  { label: 'Ожидает',   variant: 'warning' as const },
    approved: { label: 'Одобрено',  variant: 'success' as const },
    rejected: { label: 'Отклонено', variant: 'danger' as const },
  }
  const cfg = statusConfig[request.status]

  const handleApprove = () => {
    review({ id: request.id, data: { status: 'approved' } })
  }

  const handleReject = () => {
    review({ id: request.id, data: { status: 'rejected', reviewNote: rejectReason } })
    setShowReject(false)
    setRejectReason('')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div
        className="flex items-start justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3">
          <UserAvatar name={(request as any).teacher?.name ?? '?'} size="sm" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {(request as any).teacher?.name ?? 'Преподаватель'}
            </p>
            <p className="text-xs text-gray-400">
              Урок: {(request as any).lesson?.topic ?? (request as any).lessonId} · {formatDate(request.createdAt)}
            </p>
          </div>
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

          {request.reviewNote && (
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Комментарий МУП</p>
              <p className="text-sm text-gray-700">{request.reviewNote}</p>
            </div>
          )}

          {canReview && request.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              {showReject ? (
                <div className="flex-1 space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Причина отклонения…"
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" onClick={handleReject} disabled={isPending}>
                      Отклонить
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setShowReject(false)}>
                      Назад
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Одобрить
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setShowReject(true)}
                    className="flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Отклонить
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
