import type { LessonStatus, RiskLevel, MupTaskStatus, MupTaskPriority, LateRequestStatus } from './entities'

export interface ScheduleFilters {
  weekStart:   string    // ISO date (Monday of the week)
  teacherId?:  string
  groupId?:    string
  roomId?:     string
  directionId?: string
}

export interface StudentFilters {
  search?:      string
  directionId?: string
  groupId?:     string
  riskLevel?:   RiskLevel
  isActive?:    boolean
  page?:        number
  limit?:       number
}

export interface GroupFilters {
  search?:      string
  directionId?: string
  isArchived?:  boolean
}

export interface HomeworkFilters {
  groupId?:    string
  status?:     string
  teacherId?:  string
  page?:       number
  limit?:      number
}

export interface LateRequestFilters {
  status?:   LateRequestStatus
  teacherId?: string
  page?:     number
  limit?:    number
}

export interface MupTaskFilters {
  status?:    MupTaskStatus
  priority?:  MupTaskPriority
  assignedTo?: string
}

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'custom'

export interface AnalyticsFilters {
  period:  AnalyticsPeriod
  from?:   string   // required when period=custom
  to?:     string   // required when period=custom
  groupId?: string
  directionId?: string
  teacherId?: string
}
