import { apiClient } from '../axios'
import type { Direction, Subject, Room, User } from '@/types/lms'
import type { CreateDirectionDto, CreateSubjectDto, CreateRoomDto } from '@/types/lms'

export const settingsApi = {
  // Directions
  listDirections: () =>
    apiClient.get<Direction[]>('/lms/directions').then((r) => r.data),

  getDirection: (id: string) =>
    apiClient.get<Direction>(`/lms/directions/${id}`).then((r) => r.data),

  createDirection: (data: CreateDirectionDto) =>
    apiClient.post<Direction>('/lms/directions', data).then((r) => r.data),

  updateDirection: (id: string, data: Partial<CreateDirectionDto>) =>
    apiClient.patch<Direction>(`/lms/directions/${id}`, data).then((r) => r.data),

  archiveDirection: (id: string) =>
    apiClient.post(`/lms/directions/${id}/archive`).then((r) => r.data),

  deleteDirection: (id: string) =>
    apiClient.post(`/lms/directions/${id}/archive`).then((r) => r.data),

  // Subjects
  listSubjects: (params?: { directionId?: string }) =>
    apiClient.get<Subject[]>('/lms/subjects', { params }).then((r) => r.data),

  createSubject: (data: CreateSubjectDto) =>
    apiClient.post<Subject>('/lms/subjects', data).then((r) => r.data),

  updateSubject: (id: string, data: Partial<CreateSubjectDto>) =>
    apiClient.patch<Subject>(`/lms/subjects/${id}`, data).then((r) => r.data),

  archiveSubject: (id: string) =>
    apiClient.post(`/lms/subjects/${id}/archive`).then((r) => r.data),

  deleteSubject: (id: string) =>
    apiClient.post(`/lms/subjects/${id}/archive`).then((r) => r.data),

  // Rooms
  listRooms: () =>
    apiClient.get<Room[]>('/lms/rooms').then((r) => r.data),

  createRoom: (data: CreateRoomDto) =>
    apiClient.post<Room>('/lms/rooms', data).then((r) => r.data),

  updateRoom: (id: string, data: Partial<CreateRoomDto & { isActive: boolean }>) =>
    apiClient.patch<Room>(`/lms/rooms/${id}`, data).then((r) => r.data),

  deleteRoom: (id: string) =>
    apiClient.delete(`/lms/rooms/${id}`).then((r) => r.data),

  // Teachers (for dropdowns)
  listTeachers: () =>
    apiClient.get<User[]>('/lms/users?role=teacher').then((r) => r.data),

  // All LMS users
  listUsers: () =>
    apiClient.get<User[]>('/lms/users').then((r) => r.data),
}

export const notificationsApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
    apiClient.get('/notifications', { params }).then((r) => r.data),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post('/notifications/read-all').then((r) => r.data),
}
