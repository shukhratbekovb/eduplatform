import { apiClient } from '../axios'
import type {
  LmsAnalyticsOverview, AttendanceStat, GradeDistributionItem,
  TeacherPerformanceStat, RiskLevel,
} from '@/types/lms'

export const analyticsApi = {
  overview: (params: Record<string, string>) =>
    apiClient.get<LmsAnalyticsOverview>('/lms/analytics/overview', { params }).then((r) => r.data),

  attendance: (params: Record<string, string>) =>
    apiClient.get<AttendanceStat[]>('/lms/analytics/attendance', { params }).then((r) => r.data),

  grades: (params: Record<string, string>) =>
    apiClient.get<GradeDistributionItem[]>('/lms/analytics/grades', { params }).then((r) => r.data),

  risk: (params: Record<string, string>) =>
    apiClient.get<{ normal: number; at_risk: number; critical: number }>('/lms/analytics/risk', { params }).then((r) => r.data),

  homework: (params: Record<string, string>) =>
    apiClient.get<{ submittedRate: number; reviewedRate: number; overdueRate: number }>('/lms/analytics/homework', { params }).then((r) => r.data),

  teachers: (params: Record<string, string>) =>
    apiClient.get<TeacherPerformanceStat[]>('/lms/analytics/teachers', { params }).then((r) => r.data),

  homeworkByTeacher: () =>
    apiClient.get<HomeworkTeacherStat[]>('/lms/analytics/homework-by-teacher').then((r) => r.data),
}

export interface HomeworkTeacherStat {
  teacherId:   string
  teacherName: string
  total:       number
  reviewed:    number
  pending:     number
  overdue:     number
  reviewRate:  number
}
