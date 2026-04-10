import { apiClient } from '@/lib/api/axios'
import type {
  DashboardData, Assignment, AssignmentStatus, Lesson, Material,
  Achievement, Payment, Contact, Subject, SubjectPerformance,
  LeaderboardEntry, MaterialLanguage,
} from '@/types/student'

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/student/dashboard').then((r) => r.data),
  leaderboard: (period: '30d' | 'all') =>
    apiClient.get<LeaderboardEntry[]>('/student/leaderboard', { params: { period } }).then((r) => r.data),
}

// ── Assignments ───────────────────────────────────────────────────────────────
export const assignmentsApi = {
  list: (status?: AssignmentStatus | 'overdue') =>
    apiClient.get<Assignment[]>('/student/assignments', { params: { status } }).then((r) => r.data),
  submit: (id: string, data: { fileUrl?: string; text?: string }) =>
    apiClient.post(`/student/assignments/${id}/submit`, data).then((r) => r.data),
}

// ── Performance ───────────────────────────────────────────────────────────────
export const performanceApi = {
  subjects: () => apiClient.get<Subject[]>('/student/subjects').then((r) => r.data),
  subject: (subjectId: string) =>
    apiClient.get<SubjectPerformance>(`/student/performance/${subjectId}`).then((r) => r.data),
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export const scheduleApi = {
  week: (weekStart: string) =>
    apiClient.get<Lesson[]>('/student/schedule', { params: { weekStart } }).then((r) => r.data),
}

// ── Materials ─────────────────────────────────────────────────────────────────
export const materialsApi = {
  list: (params: { subjectId?: string; language?: MaterialLanguage }) =>
    apiClient.get<Material[]>('/student/materials', { params }).then((r) => r.data),
}

// ── Achievements ──────────────────────────────────────────────────────────────
export const achievementsApi = {
  list: () => apiClient.get<Achievement[]>('/student/achievements').then((r) => r.data),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: () => apiClient.get<Payment[]>('/student/payments').then((r) => r.data),
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export const contactsApi = {
  list: () => apiClient.get<Contact[]>('/student/contacts').then((r) => r.data),
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (dto: { email: string; password: string }) =>
    apiClient.post<{ student: import('@/types/student').Student; accessToken: string }>('/auth/login', dto).then((r) => r.data),
}
