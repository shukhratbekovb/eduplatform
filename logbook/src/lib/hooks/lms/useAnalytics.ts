import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api/lms/analytics'
import { lmsKeys } from '@/lib/api/lms/query-keys'
import type { AnalyticsFilters } from '@/types/lms'

export function useHomeworkByTeacher() {
  return useQuery({
    queryKey: ['lms', 'analytics', 'homework-by-teacher'],
    queryFn:  () => analyticsApi.homeworkByTeacher(),
    staleTime: 5 * 60_000,
  })
}

function toParams(filters: AnalyticsFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
  )
}

export function useAnalyticsOverview(filters: AnalyticsFilters) {
  const params = toParams(filters)
  return useQuery({
    queryKey: lmsKeys.analyticsOverview(params),
    queryFn:  () => analyticsApi.overview(params),
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsAttendance(filters: AnalyticsFilters) {
  const params = toParams(filters)
  return useQuery({
    queryKey: lmsKeys.analyticsAttendance(params),
    queryFn:  () => analyticsApi.attendance(params),
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsGrades(filters: AnalyticsFilters) {
  const params = toParams(filters)
  return useQuery({
    queryKey: lmsKeys.analyticsGrades(params),
    queryFn:  () => analyticsApi.grades(params),
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsRisk(filters: AnalyticsFilters) {
  const params = toParams(filters)
  return useQuery({
    queryKey: lmsKeys.analyticsRisk(params),
    queryFn:  () => analyticsApi.risk(params),
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsHomework(filters: AnalyticsFilters) {
  const params = toParams(filters)
  return useQuery({
    queryKey: lmsKeys.analyticsHomework(params),
    queryFn:  () => analyticsApi.homework(params),
    staleTime: 5 * 60_000,
  })
}

export function useAnalyticsTeachers(filters: AnalyticsFilters) {
  const params = toParams(filters)
  return useQuery({
    queryKey: lmsKeys.analyticsTeachers(params),
    queryFn:  () => analyticsApi.teachers(params),
    staleTime: 5 * 60_000,
  })
}
