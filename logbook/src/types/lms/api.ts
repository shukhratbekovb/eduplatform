// ─── Common ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data:       T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

export interface ApiError {
  code:    string
  message: string
  details: Record<string, string[]> | null
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email:    string
  password: string
}

export interface LoginResponse {
  user:        import('./entities').User
  accessToken: string
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export interface CreateLessonDto {
  groupId:    string
  subjectId?: string
  teacherId?: string
  roomId?:    string
  date:       string     // YYYY-MM-DD
  startTime:  string     // HH:mm
  endTime:    string     // HH:mm
  topic?:     string
}

export interface BulkCreateLessonsDto {
  groupId:    string
  subjectId?: string
  teacherId?: string
  roomId?:    string
  startDate:  string     // YYYY-MM-DD
  endDate:    string     // YYYY-MM-DD
  weekdays:   number[]   // 1=Mon … 7=Sun
  startTime:  string     // HH:mm
  endTime:    string     // HH:mm
}

export interface ConflictDetail {
  type:         'teacher' | 'room' | 'student_group'
  conflictDate: string
  conflictTime: string
  existingLesson: { id: string; groupName: string }
}

export interface UpdateLessonDto {
  roomId?:      string
  date?:        string
  startTime?:   string
  endTime?:     string
  topic?:       string
  cancelReason?: string
}

export interface ConductLessonDto {
  topic:       string
  attendance:  { studentId: string; status: import('./entities').AttendanceStatus; note?: string }[]
  grades:      { studentId: string; grade: number; comment?: string }[]
  diamonds:    { studentId: string; diamonds: number }[]
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export interface CreateGroupDto {
  name:        string
  directionId: string
  subjectId:   string
  teacherId:   string
  startDate:   string
  endDate:     string
}

export interface EnrollStudentDto {
  studentId: string
  groupId:   string
}

// ─── Students ────────────────────────────────────────────────────────────────

export interface CreateStudentDto {
  fullName:    string
  phone?:      string
  email?:      string
  dateOfBirth?: string
  parentName?: string
  parentPhone?: string
}

export interface UpdateStudentDto extends Partial<CreateStudentDto> {}

// ─── Homework ────────────────────────────────────────────────────────────────

export interface CreateHomeworkDto {
  lessonId:    string
  title:       string
  description?: string
  dueDate:     string
}

export interface ReviewHomeworkDto {
  grade:    number
  feedback: string
}

// ─── Late Requests ────────────────────────────────────────────────────────────

export interface CreateLateRequestDto {
  lessonId: string
  reason:   string
}

export interface ReviewLateRequestDto {
  status:     'approved' | 'rejected'
  reviewNote?: string
}

// ─── MUP Tasks ────────────────────────────────────────────────────────────────

export interface CreateMupTaskDto {
  title:       string
  description?: string
  priority:    import('./entities').MupTaskPriority
  dueDate?:    string
  assignedTo:  string
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface CreateDirectionDto {
  name:        string
  description?: string
  color:       string
}

export interface CreateSubjectDto {
  directionId: string
  name:        string
  description?: string
}

export interface CreateRoomDto {
  name:     string
  capacity?: number
}

// ─── Compensation ────────────────────────────────────────────────────────────

export interface SetCompensationDto {
  modelType:        import('./entities').CompensationModelType
  isHybrid:         boolean
  ratePerLesson?:   Record<string, number>
  fixedMonthlyRate?: number
  ratePerStudent?:  Record<string, number>
  effectiveFrom:    string
}
