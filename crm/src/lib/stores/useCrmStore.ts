import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type LeadsFilters,
  type TasksFilters,
  type AnalyticsPeriod,
  defaultLeadsFilters,
  defaultTasksFilters,
} from '@/types/crm'

interface CrmStore {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Leads
  activeFunnelId: string | null
  setActiveFunnelId: (id: string) => void
  leadsView: 'kanban' | 'list'
  setLeadsView: (v: 'kanban' | 'list') => void
  leadsFilters: LeadsFilters
  setLeadsFilter: <K extends keyof LeadsFilters>(k: K, v: LeadsFilters[K]) => void
  clearLeadsFilters: () => void

  // Tasks
  tasksView: 'kanban' | 'calendar'
  setTasksView: (v: 'kanban' | 'calendar') => void
  tasksFilters: TasksFilters
  setTasksFilter: <K extends keyof TasksFilters>(k: K, v: TasksFilters[K]) => void
  showAllManagersTasks: boolean
  setShowAllManagersTasks: (v: boolean) => void
  taskManagerFilter: string | null
  setTaskManagerFilter: (id: string | null) => void

  // Analytics
  analyticsPeriod: AnalyticsPeriod
  setAnalyticsPeriod: (p: AnalyticsPeriod) => void
}

export const useCrmStore = create<CrmStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      activeFunnelId: null,
      setActiveFunnelId: (id) => set({ activeFunnelId: id }),
      leadsView: 'kanban',
      setLeadsView: (v) => set({ leadsView: v }),
      leadsFilters: defaultLeadsFilters,
      setLeadsFilter: (k, v) =>
        set((s) => ({ leadsFilters: { ...s.leadsFilters, [k]: v } })),
      clearLeadsFilters: () => set({ leadsFilters: defaultLeadsFilters }),

      tasksView: 'kanban',
      setTasksView: (v) => set({ tasksView: v }),
      tasksFilters: defaultTasksFilters,
      setTasksFilter: (k, v) =>
        set((s) => ({ tasksFilters: { ...s.tasksFilters, [k]: v } })),
      showAllManagersTasks: false,
      setShowAllManagersTasks: (v) => set({ showAllManagersTasks: v }),
      taskManagerFilter: null,
      setTaskManagerFilter: (id) => set({ taskManagerFilter: id }),

      analyticsPeriod: { type: 'month' },
      setAnalyticsPeriod: (p) => set({ analyticsPeriod: p }),
    }),
    {
      name: 'edu-crm',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        activeFunnelId:   s.activeFunnelId,
        leadsView:        s.leadsView,
        tasksView:        s.tasksView,
      }),
    }
  )
)

// Derived selectors
export const useActiveFiltersCount = () =>
  useCrmStore((s) => {
    const f = s.leadsFilters
    return (
      (f.search ? 1 : 0) +
      f.stageIds.length +
      f.sourceIds.length +
      f.assignedTo.length +
      f.status.length +
      (f.createdFrom ? 1 : 0)
    )
  })
