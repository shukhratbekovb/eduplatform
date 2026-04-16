import { apiClient } from '../axios'
import type { Group, Enrollment, Student, Lesson } from '@/types/lms'
import type { CreateGroupDto, EnrollStudentDto } from '@/types/lms'
import type { PaginatedResponse } from '@/types/lms'

export const groupsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get('/lms/groups', { params }).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : (d as any).data ?? (d as any).items ?? []
    }) as Promise<Group[]>,

  get: (id: string) =>
    apiClient.get<Group>(`/lms/groups/${id}`).then((r) => r.data),

  create: (data: CreateGroupDto) =>
    apiClient.post<Group>('/lms/groups', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateGroupDto>) =>
    apiClient.patch<Group>(`/lms/groups/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    apiClient.post(`/lms/groups/${id}/archive`).then((r) => r.data),

  // Students in group
  getStudents: (id: string) =>
    apiClient.get<Student[]>(`/lms/groups/${id}/students`).then((r) => r.data),

  enroll: (data: EnrollStudentDto) =>
    apiClient.post<Enrollment>('/lms/enrollments', data).then((r) => r.data),

  unenroll: (enrollmentId: string) =>
    apiClient.delete(`/lms/enrollments/${enrollmentId}`).then((r) => r.data),

  // Lessons in group
  getLessons: (id: string, params?: Record<string, string>) =>
    apiClient.get<Lesson[]>(`/lms/groups/${id}/lessons`, { params }).then((r) => r.data),
}
