import { apiClient } from '../axios'
import type { MupTask } from '@/types/lms'
import type { CreateMupTaskDto } from '@/types/lms'

export const mupTasksApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<MupTask[]>('/lms/tasks', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<MupTask>(`/lms/tasks/${id}`).then((r) => r.data),

  create: (data: CreateMupTaskDto) =>
    apiClient.post<MupTask>('/lms/tasks', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateMupTaskDto>) =>
    apiClient.patch<MupTask>(`/lms/tasks/${id}`, data).then((r) => r.data),

  move: (id: string, status: MupTask['status']) =>
    apiClient.post<MupTask>(`/lms/tasks/${id}/move`, { status }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/lms/tasks/${id}`).then((r) => r.data),
}
