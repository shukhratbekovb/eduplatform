import { apiClient } from '../axios'
import type { LateEntryRequest } from '@/types/lms'
import type { CreateLateRequestDto, ReviewLateRequestDto } from '@/types/lms'
import type { PaginatedResponse } from '@/types/lms'

export const lateRequestsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<LateEntryRequest>>('/lms/late-requests', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<LateEntryRequest>(`/lms/late-requests/${id}`).then((r) => r.data),

  create: (data: CreateLateRequestDto) =>
    apiClient.post<LateEntryRequest>('/lms/late-requests', data).then((r) => r.data),

  review: (id: string, data: ReviewLateRequestDto) =>
    apiClient.post<LateEntryRequest>(`/lms/late-requests/${id}/review`, data).then((r) => r.data),
}
