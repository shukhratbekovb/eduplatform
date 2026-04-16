import { apiClient } from '../axios'
import type { Student, RiskFactors, CoinTransaction } from '@/types/lms'
import type { CreateStudentDto, UpdateStudentDto } from '@/types/lms'
import type { PaginatedResponse } from '@/types/lms'

export const studentsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Student>>('/lms/students', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Student>(`/lms/students/${id}`).then((r) => r.data),

  create: (data: CreateStudentDto) =>
    apiClient.post<Student>('/lms/students', data).then((r) => r.data),

  update: (id: string, data: UpdateStudentDto) =>
    apiClient.patch<Student>(`/lms/students/${id}`, data).then((r) => r.data),

  getRisk: (id: string) =>
    apiClient.get<RiskFactors>(`/lms/students/${id}/risk`).then((r) => r.data),

  getCoins: (id: string, params?: Record<string, string | number>) =>
    apiClient.get<CoinTransaction[]>(`/lms/students/${id}/coins`, { params }).then((r) => r.data),

  getTeachers: () =>
    apiClient.get<{ id: string; name: string; avatarUrl: string | null }[]>('/lms/teachers').then((r) => r.data),
}
