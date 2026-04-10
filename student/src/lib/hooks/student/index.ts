'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  dashboardApi, assignmentsApi, performanceApi,
  scheduleApi, materialsApi, achievementsApi, paymentsApi, contactsApi,
} from '@/lib/api/student'
import type { AssignmentStatus, MaterialLanguage } from '@/types/student'

const STALE = 5 * 60_000

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn:  dashboardApi.get,
    staleTime: STALE,
  })
}

export function useLeaderboard(period: '30d' | 'all' = '30d') {
  return useQuery({
    queryKey: ['student', 'leaderboard', period],
    queryFn:  () => dashboardApi.leaderboard(period),
    staleTime: STALE,
  })
}

// ── Assignments ───────────────────────────────────────────────────────────────
export function useAssignments(status?: AssignmentStatus | 'overdue') {
  return useQuery({
    queryKey: ['student', 'assignments', status ?? 'all'],
    queryFn:  () => assignmentsApi.list(status),
    staleTime: STALE,
  })
}

export function useSubmitAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { fileUrl?: string; text?: string } }) =>
      assignmentsApi.submit(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'assignments'] })
      qc.invalidateQueries({ queryKey: ['student', 'dashboard'] })
    },
  })
}

// ── Performance ───────────────────────────────────────────────────────────────
export function useSubjects() {
  return useQuery({
    queryKey: ['student', 'subjects'],
    queryFn:  performanceApi.subjects,
    staleTime: STALE,
  })
}

export function useSubjectPerformance(subjectId: string) {
  return useQuery({
    queryKey: ['student', 'performance', subjectId],
    queryFn:  () => performanceApi.subject(subjectId),
    enabled:  !!subjectId,
    staleTime: STALE,
  })
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export function useSchedule(weekStart: string) {
  return useQuery({
    queryKey: ['student', 'schedule', weekStart],
    queryFn:  () => scheduleApi.week(weekStart),
    staleTime: STALE,
  })
}

// ── Materials ─────────────────────────────────────────────────────────────────
export function useMaterials(params: { subjectId?: string; language?: MaterialLanguage } = {}) {
  return useQuery({
    queryKey: ['student', 'materials', params],
    queryFn:  () => materialsApi.list(params),
    staleTime: STALE,
  })
}

// ── Achievements ──────────────────────────────────────────────────────────────
export function useAchievements() {
  return useQuery({
    queryKey: ['student', 'achievements'],
    queryFn:  achievementsApi.list,
    staleTime: STALE,
  })
}

// ── Payments ──────────────────────────────────────────────────────────────────
export function usePayments() {
  return useQuery({
    queryKey: ['student', 'payments'],
    queryFn:  paymentsApi.list,
    staleTime: STALE,
  })
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export function useContacts() {
  return useQuery({
    queryKey: ['student', 'contacts'],
    queryFn:  contactsApi.list,
    staleTime: STALE,
  })
}
