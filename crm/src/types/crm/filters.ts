import type { LeadStatus, TaskPriority } from './entities'

export interface LeadsFilters {
  search: string
  stageIds: string[]
  sourceIds: string[]
  assignedTo: string[]
  status: LeadStatus[]
  createdFrom?: string
  createdTo?: string
}

export const defaultLeadsFilters: LeadsFilters = {
  search: '',
  stageIds: [],
  sourceIds: [],
  assignedTo: [],
  status: [],
}

export interface TasksFilters {
  assignedTo: string[]
  priority: TaskPriority[]
  leadId?: string
  dueDateFrom?: string
  dueDateTo?: string
}

export const defaultTasksFilters: TasksFilters = {
  assignedTo: [],
  priority: [],
}

export type AnalyticsPeriodType = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export interface AnalyticsPeriod {
  type: AnalyticsPeriodType
  from?: string
  to?: string
}
