// ─── Users ───────────────────────────────────────────────────────────────────

export type UserRole =
  | 'director'
  | 'mup'            // Academic Manager (МУП)
  | 'teacher'
  | 'sales_manager'
  | 'cashier'
  | 'student'

export interface User {
  id:        string
  name:      string
  email:     string
  role:      UserRole
  avatarUrl: string | null
}

// ─── Educational Structure ───────────────────────────────────────────────────

export interface Direction {
  id:           string
  name:         string
  description:  string | null
  color:        string        // HEX — used for schedule color-coding
  isArchived:   boolean
  subjectCount: number        // computed
  groupCount:   number        // computed
  createdAt:    string
}

export interface Subject {
  id:          string
  directionId: string
  direction:   Direction
  name:        string
  description: string | null
  isArchived:  boolean
}

export interface Room {
  id:       string
  name:     string           // e.g. "Кабинет 101"
  capacity: number | null
  isActive: boolean
}

export interface Group {
  id:           string
  name:         string
  directionId:  string
  direction:    Direction
  subjectId:    string
  subject:      Subject
  teacherId:    string
  teacher:      User
  startDate:    string        // ISO date
  endDate:      string        // ISO date
  isArchived:   boolean
  studentCount: number        // computed
  createdAt:    string
}

export interface Enrollment {
  id:               string
  studentId:        string
  groupId:          string
  group:            Group
  enrolledAt:       string        // ISO date
  transferredFrom?: string        // groupId if transferred
  status:           'active' | 'completed' | 'dropped'
}

// ─── Students ────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type BadgeLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Student {
  id:                string
  fullName:          string
  phone:             string | null
  email:             string | null
  dateOfBirth:       string | null  // ISO date
  photoUrl:          string | null
  parentName:        string | null
  parentPhone:       string | null
  isActive:          boolean
  enrollments:       Enrollment[]
  riskLevel:         RiskLevel
  riskLastUpdated:   string         // ISO datetime — nightly batch
  totalCoins:        number
  badgeLevel:        BadgeLevel
  gpa:               number | null
  attendancePercent: number | null
  createdAt:         string
}

export interface RiskFactors {
  studentId:       string
  attendanceScore: RiskLevel
  gradesScore:     RiskLevel
  homeworkScore:   RiskLevel
  paymentScore:    RiskLevel
  overallRisk:     RiskLevel
  calculatedAt:    string
  details: {
    attendancePercent14d: number
    avgGradeLast5:        number
    missedHomeworkStreak: number
    debtDays:             number
  }
}

// ─── Schedule & Lessons ──────────────────────────────────────────────────────

export type LessonStatus =
  | 'scheduled'    // future lesson
  | 'in_progress'  // today, within time window
  | 'conducted'    // attendance + topic filled, window passed
  | 'incomplete'   // window passed, missing data
  | 'cancelled'    // cancelled by MUP

export type AttendanceStatus = 'on_time' | 'late' | 'absent'

export interface Lesson {
  id:           string
  groupId:      string
  group:        Group
  teacherId:    string
  teacher:      User
  roomId:       string | null
  room:         Room | null
  date:         string     // ISO date YYYY-MM-DD
  startTime:    string     // "HH:mm"
  endTime:      string     // "HH:mm"
  topic:        string | null
  status:       LessonStatus
  isRecurring:  boolean
  seriesId:     string | null
  cancelReason: string | null
  createdAt:    string
}

export interface AttendanceRecord {
  lessonId:  string
  studentId: string
  student:   Student
  status:    AttendanceStatus
  note:      string | null
}

export interface GradeRecord {
  lessonId:  string
  studentId: string
  student:   Student
  grade:     number        // 1–10
  comment:   string | null // required if grade < 6
}

export interface DiamondRecord {
  lessonId:  string
  studentId: string
  student:   Student
  diamonds:  number        // 1–3 (max per student per lesson)
}

export interface LessonMaterial {
  id:        string
  lessonId:  string
  type:      'file' | 'link'
  name:      string
  url:       string
  sizeBytes: number | null
  createdAt: string
}

// ─── Homework ────────────────────────────────────────────────────────────────

export type HomeworkStatus = 'not_submitted' | 'submitted' | 'reviewed' | 'overdue'

export interface HomeworkAssignment {
  id:          string
  lessonId:    string
  lesson:      Lesson
  groupId:     string
  title:       string
  description: string | null
  dueDate:     string      // ISO date
  createdAt:   string
}

export interface HomeworkSubmission {
  id:           string
  assignmentId: string
  assignment:   HomeworkAssignment
  studentId:    string
  student:      Student
  submittedAt:  string | null
  status:       HomeworkStatus
  fileUrl:      string | null
  comment:      string | null  // student's note
  grade:        number | null
  feedback:     string | null  // teacher feedback
  reviewedAt:   string | null
}

// ─── Late Entry Request ──────────────────────────────────────────────────────

export type LateRequestStatus = 'pending' | 'approved' | 'rejected'

export interface LateEntryRequest {
  id:          string
  lessonId:    string
  lesson:      Lesson
  teacherId:   string
  teacher:     User
  reason:      string
  status:      LateRequestStatus
  reviewedBy:  string | null     // MUP user id
  reviewNote:  string | null
  reviewedAt:  string | null
  createdAt:   string
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface CoinTransaction {
  id:        string
  studentId: string
  amount:    number    // positive = earned, negative = spent
  reason:    string    // 'diamonds' | 'bonus' | 'purchase'
  lessonId:  string | null
  createdAt: string
}

// ─── MUP Tasks ───────────────────────────────────────────────────────────────

export type MupTaskStatus   = 'pending' | 'in_progress' | 'done'
export type MupTaskPriority = 'low' | 'medium' | 'high'

export interface MupTask {
  id:          string
  title:       string
  description: string | null
  status:      MupTaskStatus
  priority:    MupTaskPriority
  dueDate:     string | null
  assignedTo:  string
  assignee:    User
  createdAt:   string
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'lesson_reminder'
  | 'late_request_approved'
  | 'late_request_rejected'
  | 'homework_due'
  | 'task_assigned'
  | 'risk_level_changed'

export interface AppNotification {
  id:           string
  type:         NotificationType
  title:        string
  body:         string
  isRead:       boolean
  linkedId:     string | null
  createdAt:    string
}

// ─── Teacher Compensation ────────────────────────────────────────────────────

export type CompensationModelType = 'per_lesson' | 'fixed_monthly' | 'per_student'

export interface CompensationModel {
  id:          string
  teacherId:   string
  teacher:     User
  modelType:   CompensationModelType
  isHybrid:    boolean
  // per_lesson
  ratePerLesson:   Record<string, number> | null  // subjectId → rate
  // fixed_monthly
  fixedMonthlyRate: number | null
  // per_student
  ratePerStudent:  Record<string, number> | null  // subjectId → rate per student
  effectiveFrom:   string    // ISO date
  createdAt:       string
}

export interface SalaryCalculation {
  id:          string
  teacherId:   string
  teacher:     User
  period:      string      // "2026-03"
  amount:      number
  breakdown:   SalaryBreakdownItem[]
  isLocked:    boolean
  calculatedAt: string
}

export interface SalaryBreakdownItem {
  groupId:     string
  groupName:   string
  lessonCount: number
  studentCount: number
  amount:      number
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export type ExamStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled'

export interface Exam {
  id:          string
  title:       string
  groupId:     string
  group:       Group
  date:        string     // ISO date YYYY-MM-DD
  startTime:   string     // "HH:mm"
  endTime:     string     // "HH:mm"
  roomId:      string | null
  room:        Room | null
  description: string | null
  status:      ExamStatus
  createdAt:   string
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface LmsAnalyticsOverview {
  totalStudents:       number
  activeGroups:        number
  lessonsThisWeek:     number
  avgAttendance:       number  // percent
  atRiskStudents:      number
  criticalStudents:    number
  homeworkSubmitRate:  number  // percent
  incompleteLesson:    number
  delta: {
    avgAttendance:    number
    atRiskStudents:   number
    homeworkSubmitRate: number
  }
}

export interface AttendanceStat {
  date:            string
  attendanceRate:  number  // percent
  lessonCount:     number
}

export interface GradeDistributionItem {
  subjectId:   string
  subjectName: string
  avgGrade:    number
  distribution: Record<string, number>  // grade → count
}

export interface TeacherPerformanceStat {
  teacherId:        string
  teacherName:      string
  avatarUrl:        string | null
  lessonsScheduled: number
  lessonsConducted: number
  lessonsIncomplete: number
  conductRate:      number  // percent
}
