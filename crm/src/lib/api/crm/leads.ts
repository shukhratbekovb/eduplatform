import { apiClient } from '@/lib/api/axios'
import type { User } from '@/types/crm'
import type {
  Lead, LeadSource, TimelineEntry, LeadComment,
  PaginatedResponse,
  CreateLeadDto, UpdateLeadDto,
  MoveLeadStageDto, AssignLeadDto, MarkLeadLostDto,
  CreateActivityDto, CreateSourceDto, UpdateSourceDto,
  ImportJobStatus,
} from '@/types/crm'
import type { LeadsFilters } from '@/types/crm/filters'

export const leadsApi = {
  list: (params: Partial<LeadsFilters> & { funnelId?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Lead>>('/crm/leads', { params }).then(r => r.data),

  get:       (id: string)                     => apiClient.get<Lead>(`/crm/leads/${id}`).then(r => r.data),
  create:    (dto: CreateLeadDto)             => apiClient.post<Lead>('/crm/leads', dto).then(r => r.data),
  update:    (id: string, dto: UpdateLeadDto) => apiClient.patch<Lead>(`/crm/leads/${id}`, dto).then(r => r.data),
  delete:    (id: string)                     => apiClient.delete(`/crm/leads/${id}`),
  moveStage: (id: string, dto: MoveLeadStageDto) =>
    apiClient.post<Lead>(`/crm/leads/${id}/move-stage`, dto).then(r => r.data),
  assign:    (id: string, dto: AssignLeadDto) =>
    apiClient.post<Lead>(`/crm/leads/${id}/assign`, dto).then(r => r.data),
  markWon:   (id: string)                     =>
    apiClient.post<Lead>(`/crm/leads/${id}/mark-won`).then(r => r.data),
  markLost:  (id: string, dto: MarkLeadLostDto) =>
    apiClient.post<Lead>(`/crm/leads/${id}/mark-lost`, dto).then(r => r.data),

  import: (formData: FormData) =>
    apiClient.post<{ jobId: string }>('/crm/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  importStatus: (jobId: string) =>
    apiClient.get<ImportJobStatus>(`/crm/leads/import/${jobId}/status`).then(r => r.data),

  // Timeline
  timeline: (leadId: string, page = 1) =>
    apiClient.get<PaginatedResponse<TimelineEntry>>(
      `/crm/leads/${leadId}/timeline`, { params: { page, limit: 20 } }
    ).then(r => r.data),

  createActivity: (leadId: string, dto: CreateActivityDto) =>
    apiClient.post(`/crm/leads/${leadId}/activities`, dto).then(r => r.data),

  createComment: (leadId: string, text: string) =>
    apiClient.post<LeadComment>(`/crm/leads/${leadId}/comments`, { text }).then(r => r.data),

  updateComment: (leadId: string, commentId: string, text: string) =>
    apiClient.patch<LeadComment>(`/crm/leads/${leadId}/comments/${commentId}`, { text }).then(r => r.data),

  deleteComment: (leadId: string, commentId: string) =>
    apiClient.delete(`/crm/leads/${leadId}/comments/${commentId}`),
}

export const usersApi = {
  listManagers: () =>
    apiClient.get<User[]>('/crm/users').then(r => r.data),
}

export const sourcesApi = {
  list:             ()                              => apiClient.get<LeadSource[]>('/crm/lead-sources').then(r => r.data),
  create:           (dto: CreateSourceDto)          => apiClient.post<LeadSource>('/crm/lead-sources', dto).then(r => r.data),
  update:           (id: string, dto: UpdateSourceDto) =>
    apiClient.patch<LeadSource>(`/crm/lead-sources/${id}`, dto).then(r => r.data),
  delete:           (id: string)                    => apiClient.delete(`/crm/lead-sources/${id}`),
  regenerateSecret: (id: string)                    =>
    apiClient.post<{ webhookSecret: string }>(`/crm/lead-sources/${id}/regenerate-secret`).then(r => r.data),
}
