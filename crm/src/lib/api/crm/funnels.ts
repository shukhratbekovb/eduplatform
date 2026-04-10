import { apiClient } from '@/lib/api/axios'
import type {
  Funnel, Stage, CustomField,
  CreateFunnelDto, UpdateFunnelDto,
  CreateStageDto, UpdateStageDto, ReorderStagesDto, MigrateLeadsDto,
  CreateCustomFieldDto, UpdateCustomFieldDto, ReorderCustomFieldsDto,
} from '@/types/crm'

export const funnelsApi = {
  // Funnels
  list:    ()                        => apiClient.get<Funnel[]>('/crm/funnels').then(r => r.data),
  get:     (id: string)              => apiClient.get<Funnel>(`/crm/funnels/${id}`).then(r => r.data),
  create:  (dto: CreateFunnelDto)    => apiClient.post<Funnel>('/crm/funnels', dto).then(r => r.data),
  update:  (id: string, dto: UpdateFunnelDto) =>
    apiClient.patch<Funnel>(`/crm/funnels/${id}`, dto).then(r => r.data),
  archive: (id: string)              => apiClient.post(`/crm/funnels/${id}/archive`),
  delete:  (id: string)              => apiClient.delete(`/crm/funnels/${id}`),

  // Stages
  stages: {
    list:    (funnelId: string)                         =>
      apiClient.get<Stage[]>(`/crm/funnels/${funnelId}/stages`).then(r => r.data),
    create:  (funnelId: string, dto: CreateStageDto)    =>
      apiClient.post<Stage>(`/crm/funnels/${funnelId}/stages`, dto).then(r => r.data),
    update:  (funnelId: string, stageId: string, dto: UpdateStageDto) =>
      apiClient.patch<Stage>(`/crm/funnels/${funnelId}/stages/${stageId}`, dto).then(r => r.data),
    delete:  (funnelId: string, stageId: string)        =>
      apiClient.delete(`/crm/funnels/${funnelId}/stages/${stageId}`),
    reorder: (funnelId: string, dto: ReorderStagesDto)  =>
      apiClient.post(`/crm/funnels/${funnelId}/stages/reorder`, dto),
    migrate: (funnelId: string, stageId: string, dto: MigrateLeadsDto) =>
      apiClient.post(`/crm/funnels/${funnelId}/stages/${stageId}/migrate-leads`, dto),
  },

  // Custom Fields
  fields: {
    list:    (funnelId: string)                              =>
      apiClient.get<CustomField[]>(`/crm/funnels/${funnelId}/custom-fields`).then(r => r.data),
    create:  (funnelId: string, dto: CreateCustomFieldDto)   =>
      apiClient.post<CustomField>(`/crm/funnels/${funnelId}/custom-fields`, dto).then(r => r.data),
    update:  (funnelId: string, fieldId: string, dto: UpdateCustomFieldDto) =>
      apiClient.patch<CustomField>(`/crm/funnels/${funnelId}/custom-fields/${fieldId}`, dto).then(r => r.data),
    delete:  (funnelId: string, fieldId: string)             =>
      apiClient.delete(`/crm/funnels/${funnelId}/custom-fields/${fieldId}`),
    reorder: (funnelId: string, dto: ReorderCustomFieldsDto) =>
      apiClient.post(`/crm/funnels/${funnelId}/custom-fields/reorder`, dto),
  },
}
