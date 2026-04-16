import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lateRequestsApi } from '@/lib/api/lms/late-requests'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { CreateLateRequestDto, ReviewLateRequestDto, LateRequestFilters } from '@/types/lms'

export function useLateRequests(filters?: LateRequestFilters) {
  const params = filters
    ? Object.fromEntries(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
    : undefined
  return useQuery({
    queryKey: lmsKeys.lateRequests(params),
    queryFn:  () => lateRequestsApi.list(params),
  })
}

export function useCreateLateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateLateRequestDto) => lateRequestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'late-requests'] })
      toast.success('Запрос отправлен МУП на рассмотрение')
    },
    onError: () => toast.error('Не удалось отправить запрос'),
  })
}

export function useReviewLateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewLateRequestDto }) =>
      lateRequestsApi.review(id, data),
    onSuccess: (req) => {
      qc.invalidateQueries({ queryKey: ['lms', 'late-requests'] })
      const label = req.status === 'approved' ? 'одобрен' : 'отклонён'
      toast.success(`Запрос ${label}`)
    },
    onError: () => toast.error('Не удалось обработать запрос'),
  })
}

export function usePendingLateRequestsCount(enabled = true) {
  const { data } = useQuery({
    queryKey: lmsKeys.lateRequests({ status: 'pending' }),
    queryFn:  () => lateRequestsApi.list({ status: 'pending' }),
    enabled,
  })
  return (data as any)?.total ?? 0
}
