import type {
  CustomFieldValue,
  LeadStatus,
  TaskPriority,
  TaskStatus,
  ActivityType,
  CustomFieldType,
  LeadSourceType,
} from './entities'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

// ─── Lead DTOs ────────────────────────────────────────────────────────────────
export interface CreateLeadDto {
  fullName: string
  phone: string
  email?: string
  sourceId: string
  funnelId: string
  stageId: string
  assignedTo: string
  customFields?: Record<string, CustomFieldValue>
}

export type UpdateLeadDto = Partial<CreateLeadDto>

export interface MoveLeadStageDto { stageId: string }
export interface AssignLeadDto    { userId: string }
export interface MarkLeadLostDto  { reason: string }

// ─── Funnel DTOs ──────────────────────────────────────────────────────────────
export interface CreateFunnelDto { name: string }
export type UpdateFunnelDto = Partial<CreateFunnelDto>

// ─── Stage DTOs ───────────────────────────────────────────────────────────────
export interface CreateStageDto {
  name: string
  color: string
  winProbability: number
}
export type UpdateStageDto = Partial<CreateStageDto>
export interface ReorderStagesDto { orderedIds: string[] }
export interface MigrateLeadsDto  { toStageId: string }

// ─── Custom Field DTOs ────────────────────────────────────────────────────────
export interface CreateCustomFieldDto {
  label: string
  type: CustomFieldType
  options?: string[]
}
export type UpdateCustomFieldDto = Partial<CreateCustomFieldDto>
export interface ReorderCustomFieldsDto { orderedIds: string[] }

// ─── Source DTOs ──────────────────────────────────────────────────────────────
export interface CreateSourceDto {
  name: string
  type: LeadSourceType
  funnelId?: string
}
export interface UpdateSourceDto {
  name?: string
  isActive?: boolean
  funnelId?: string
}

// ─── Activity DTOs ────────────────────────────────────────────────────────────
export interface CreateActivityDto {
  type: ActivityType
  date: string
  outcome: string
  notes?: string
  durationMinutes?: number
  channel?: string
  needsFollowUp: boolean
}

// ─── Task DTOs ────────────────────────────────────────────────────────────────
export interface CreateTaskDto {
  title: string
  description?: string
  linkedLeadId?: string
  assignedTo: string
  dueDate: string
  priority: TaskPriority
  reminderAt?: string
}
export type UpdateTaskDto = Partial<CreateTaskDto & { status: TaskStatus }>
export interface MoveTaskDto { status: TaskStatus }

// ─── Import ───────────────────────────────────────────────────────────────────
export interface ImportJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'done' | 'failed'
  imported: number
  skipped: number
  total: number
  errors: { row: number; reason: string }[]
}
