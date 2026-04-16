import { apiClient } from '../axios'
import type {
  Lesson, AttendanceRecord, GradeRecord, DiamondRecord, LessonMaterial, AppNotification,
} from '@/types/lms'
import type {
  CreateLessonDto, BulkCreateLessonsDto, UpdateLessonDto,
  ConductLessonDto, CreateLateRequestDto,
} from '@/types/lms'

export interface LessonFullData {
  lesson:     Lesson
  attendance: AttendanceRecord[]
  grades:     GradeRecord[]
  diamonds:   DiamondRecord[]
  materials:  LessonMaterial[]
}

export const scheduleApi = {
  // GET /lms/lessons — returns lessons for a week
  list: (params: Record<string, string>) =>
    apiClient.get<{ items: Lesson[] } | Lesson[]>('/lms/lessons', { params })
      .then((r) => Array.isArray(r.data) ? r.data : (r.data as any).items ?? []),

  // GET /lms/lessons/:id — single lesson
  get: (id: string) =>
    apiClient.get<Lesson>(`/lms/lessons/${id}`).then((r) => r.data),

  // GET /lms/lessons/:id/full — lesson + attendance + grades + diamonds
  getFull: (id: string) =>
    apiClient.get<LessonFullData>(`/lms/lessons/${id}/full`).then((r) => r.data),

  // POST /lms/lessons — create single lesson
  create: (data: CreateLessonDto) =>
    apiClient.post<Lesson>('/lms/lessons', data).then((r) => r.data),

  // POST /lms/lessons/bulk — create recurring schedule
  createBulk: (data: BulkCreateLessonsDto) =>
    apiClient.post<Lesson[]>('/lms/lessons/bulk', data).then((r) => r.data),

  // PATCH /lms/lessons/:id
  update: (id: string, data: UpdateLessonDto) =>
    apiClient.patch<Lesson>(`/lms/lessons/${id}`, data).then((r) => r.data),

  // POST /lms/lessons/:id/cancel
  cancel: (id: string, reason: string) =>
    apiClient.post<Lesson>(`/lms/lessons/${id}/cancel`, { reason }).then((r) => r.data),

  // POST /lms/lessons/:id/conduct — submit attendance + grades + diamonds
  conduct: (id: string, data: ConductLessonDto) =>
    apiClient.post<Lesson>(`/lms/lessons/${id}/conduct`, data).then((r) => r.data),

  // Materials
  getMaterials: (lessonId: string) =>
    apiClient.get<LessonMaterial[]>(`/lms/lessons/${lessonId}/materials`).then((r) => r.data),

  addMaterial: (lessonId: string, formData: FormData) =>
    apiClient.post<LessonMaterial>(`/lms/lessons/${lessonId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  deleteMaterial: (lessonId: string, materialId: string) =>
    apiClient.delete(`/lms/lessons/${lessonId}/materials/${materialId}`).then((r) => r.data),
}
