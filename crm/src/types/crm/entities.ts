// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'director' | 'sales_manager'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
}

// ─── Lead ─────────────────────────────────────────────────────────────────────
export type LeadStatus = 'active' | 'won' | 'lost'
export type CustomFieldValue = string | number | boolean | string[] | null

export interface Lead {
  id: string
  fullName: string
  phone: string
  email?: string
  sourceId: string
  source?: LeadSource
  funnelId: string
  funnel?: Funnel
  stageId: string
  stage?: Stage
  assignedTo: string
  assignee?: User
  status: LeadStatus
  lostReason?: string
  customFields: Record<string, CustomFieldValue>
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
}

// ─── Funnel ───────────────────────────────────────────────────────────────────
export interface Funnel {
  id: string
  name: string
  isArchived: boolean
  stageCount: number
  leadCount: number
  createdAt: string
}

// ─── Stage ────────────────────────────────────────────────────────────────────
export interface Stage {
  id: string
  funnelId: string
  name: string
  color: string
  winProbability: number
  order: number
}

// ─── Custom Field ─────────────────────────────────────────────────────────────
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox'

export interface CustomField {
  id: string
  funnelId: string
  label: string
  type: CustomFieldType
  options?: { choices: string[] } | string[] | null
  order: number
}

// ─── Lead Source ──────────────────────────────────────────────────────────────
export type LeadSourceType = 'manual' | 'import' | 'api' | 'landing'

export interface LeadSource {
  id: string
  name: string
  type: LeadSourceType
  isActive: boolean
  funnelId?: string
  apiKey?: string
  webhookUrl?: string
  webhookSecret?: string
  createdAt?: string
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
export type ActivityType = 'call' | 'meeting' | 'message' | 'other'

export interface Activity {
  id: string
  leadId: string
  type: ActivityType
  date: string
  outcome: string
  notes?: string
  durationMinutes?: number
  channel?: string
  needsFollowUp: boolean
  createdBy: string
  createdByUser?: User
  createdAt: string
}

export interface StageChange {
  id: string
  leadId: string
  fromStageId: string
  fromStage?: Stage
  toStageId: string
  toStage?: Stage
  changedBy: string
  changedByUser?: User
  changedAt: string
}

export interface AssignmentChange {
  id: string
  leadId: string
  fromUserId: string
  fromUser?: User
  toUserId: string
  toUser?: User
  changedBy: string
  changedByUser?: User
  changedAt: string
}

export interface LeadComment {
  id: string
  leadId: string
  text: string
  authorId: string
  author: User
  createdAt: string
  updatedAt: string
}

export type TimelineEntry =
  | { type: 'activity'; date: string; data: Activity }
  | { type: 'stage_change'; date: string; data: StageChange }
  | { type: 'assignment_change'; date: string; data: AssignmentChange }
  | { type: 'comment'; date: string; data: LeadComment }

// ─── Task ─────────────────────────────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue'

export interface Task {
  id: string
  title: string
  description?: string
  linkedLeadId?: string
  linkedLead?: Pick<Lead, 'id' | 'fullName'>
  assignedTo: string
  assignee?: User
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  reminderAt?: string
  isAutoCreated: boolean
  createdAt: string
}

// ─── Notification ─────────────────────────────────────────────────────────────
export type NotificationType = 'task_due_soon' | 'task_overdue' | 'task_assigned'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  linkedTaskId?: string
  createdAt: string
}
