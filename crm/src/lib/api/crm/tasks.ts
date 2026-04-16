import { apiClient } from '@/lib/api/axios'
import type { Task, AppNotification, CreateTaskDto, UpdateTaskDto, MoveTaskDto } from '@/types/crm'
import type { TasksFilters } from '@/types/crm/filters'

export const tasksApi = {
  list: (params: Partial<TasksFilters> & { all?: boolean }) =>
    apiClient.get<{ items: Task[] }>('/crm/tasks', { params }).then(r => r.data.items ?? r.data),
  get:    (id: string)                     => apiClient.get<Task>(`/crm/tasks/${id}`).then(r => r.data),
  create: (dto: CreateTaskDto)             => apiClient.post<Task>('/crm/tasks', dto).then(r => r.data),
  update: (id: string, dto: UpdateTaskDto) => apiClient.patch<Task>(`/crm/tasks/${id}`, dto).then(r => r.data),
  delete: (id: string)                     => apiClient.delete(`/crm/tasks/${id}`),
  move:   (id: string, dto: MoveTaskDto)   =>
    apiClient.post<Task>(`/crm/tasks/${id}/move`, dto).then(r => r.data),
}

export const notificationsApi = {
  list:    (unreadOnly?: boolean) =>
    apiClient.get<AppNotification[]>('/notifications', { params: { unreadOnly } }).then(r => r.data),
  markRead:    (id: string) => apiClient.post(`/notifications/${id}/read`),
  markAllRead: ()           => apiClient.post('/notifications/read-all'),
}
