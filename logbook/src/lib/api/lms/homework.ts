import { apiClient } from '../axios'
import type { HomeworkAssignment, HomeworkSubmission } from '@/types/lms'
import type { CreateHomeworkDto, ReviewHomeworkDto } from '@/types/lms'
import type { PaginatedResponse } from '@/types/lms'

export const homeworkApi = {
  listAssignments: (params?: Record<string, string>) =>
    apiClient.get<HomeworkAssignment[]>('/lms/homework', { params }).then((r) => r.data),

  createAssignment: (data: CreateHomeworkDto) =>
    apiClient.post<HomeworkAssignment>('/lms/homework', data).then((r) => r.data),

  listSubmissions: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<HomeworkSubmission>>('/lms/homework/submissions', { params }).then((r) => r.data),

  getSubmission: (id: string) =>
    apiClient.get<HomeworkSubmission>(`/lms/homework/submissions/${id}`).then((r) => r.data),

  review: (id: string, data: ReviewHomeworkDto) =>
    apiClient.post<HomeworkSubmission>(`/lms/homework/submissions/${id}/review`, data).then((r) => r.data),
}
