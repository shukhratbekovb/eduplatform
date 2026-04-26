import { apiClient } from '@/lib/api/axios'
import type { User } from '@/types/crm'
import type {
  Lead, LeadSource, TimelineEntry, LeadComment,
  PaginatedResponse,
  CreateLeadDto, UpdateLeadDto,
  MoveLeadStageDto, AssignLeadDto, MarkLeadLostDto,
  CreateActivityDto, CreateSourceDto, UpdateSourceDto,
  ImportResult,
} from '@/types/crm'
import type { LeadsFilters } from '@/types/crm/filters'

function serializeParams(params: Record<string, any>): string {
  const parts: string[] = []
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null || val === '') continue
    if (Array.isArray(val)) {
      if (val.length === 0) continue
      for (const v of val) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    }
  }
  return parts.join('&')
}

export const leadsApi = {
  list: (params: Partial<LeadsFilters> & { funnelId?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Lead>>('/crm/leads', {
      params,
      paramsSerializer: serializeParams,
    }).then(r => r.data),

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
    apiClient.post<ImportResult>('/crm/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

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

export interface CreateCrmUserDto {
  name: string
  email: string
  password: string
  role?: string
}
export interface UpdateCrmUserDto {
  name?: string
  email?: string
  role?: string
  isActive?: boolean
}

export const usersApi = {
  list:   () => apiClient.get<(User & { isActive: boolean })[]>('/crm/users').then(r => r.data),
  listManagers: () => apiClient.get<User[]>('/crm/users').then(r => r.data),
  create: (dto: CreateCrmUserDto) => apiClient.post<User>('/crm/users', dto).then(r => r.data),
  update: (id: string, dto: UpdateCrmUserDto) => apiClient.patch<User>(`/crm/users/${id}`, dto).then(r => r.data),
}

export const sourcesApi = {
  list:           ()                              => apiClient.get<LeadSource[]>('/crm/lead-sources').then(r => r.data),
  create:         (dto: CreateSourceDto)          => apiClient.post<LeadSource>('/crm/lead-sources', dto).then(r => r.data),
  update:         (id: string, dto: UpdateSourceDto) =>
    apiClient.patch<LeadSource>(`/crm/lead-sources/${id}`, dto).then(r => r.data),
  delete:         (id: string)                    => apiClient.delete(`/crm/lead-sources/${id}`),
  regenerateKey:  (id: string)                    =>
    apiClient.post<LeadSource>(`/crm/lead-sources/${id}/regenerate-key`).then(r => r.data),
}
