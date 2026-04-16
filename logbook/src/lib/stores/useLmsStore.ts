import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { startOfWeek, format } from 'date-fns'
import type { ScheduleFilters, StudentFilters, AnalyticsFilters } from '@/types/lms'

interface LmsStore {
  // Sidebar
  sidebarCollapsed:    boolean
  toggleSidebar:       () => void

  // Schedule
  scheduleWeekStart:   string       // ISO date string — Monday of current week
  scheduleFilters:     Partial<ScheduleFilters>
  setScheduleWeekStart: (date: string) => void
  setScheduleFilters:  (filters: Partial<ScheduleFilters>) => void

  // Students
  studentFilters:      StudentFilters
  setStudentFilters:   (filters: Partial<StudentFilters>) => void
  resetStudentFilters: () => void

  // Analytics
  analyticsFilters:    AnalyticsFilters
  setAnalyticsFilters: (filters: Partial<AnalyticsFilters>) => void

  // Active lesson being conducted
  activeLessonId:      string | null
  setActiveLessonId:   (id: string | null) => void
}

const defaultWeekStart = () =>
  format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

const defaultStudentFilters: StudentFilters = {
  page:  1,
  limit: 20,
}

const defaultAnalyticsFilters: AnalyticsFilters = {
  period: 'week',
}

export const useLmsStore = create<LmsStore>()(
  persist(
    (set) => ({
      sidebarCollapsed:    true,
      toggleSidebar:       () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      scheduleWeekStart:    defaultWeekStart(),
      scheduleFilters:      {},
      setScheduleWeekStart: (date) => set({ scheduleWeekStart: date }),
      setScheduleFilters:   (filters) => set((s) => ({ scheduleFilters: { ...s.scheduleFilters, ...filters } })),

      studentFilters:      defaultStudentFilters,
      setStudentFilters:   (filters) => set((s) => ({ studentFilters: { ...s.studentFilters, ...filters } })),
      resetStudentFilters: () => set({ studentFilters: defaultStudentFilters }),

      analyticsFilters:    defaultAnalyticsFilters,
      setAnalyticsFilters: (filters) => set((s) => ({ analyticsFilters: { ...s.analyticsFilters, ...filters } })),

      activeLessonId:    null,
      setActiveLessonId: (id) => set({ activeLessonId: id }),
    }),
    {
      name: 'edu-lms-store',
      partialize: (s) => ({
        sidebarCollapsed:  s.sidebarCollapsed,
        scheduleWeekStart: s.scheduleWeekStart,
      }),
    }
  )
)
