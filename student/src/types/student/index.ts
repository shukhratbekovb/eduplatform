// ── Student ───────────────────────────────────────────────────────────────────
export interface Student {
  id: string
  fullName: string
  photo: string | null
  studentCode: string        // e.g. SEP-24211
  groupId: string
  groupName: string
  stars: number
  crystals: number
  email: string
  phone: string
  dateOfBirth: string        // ISO
}

// ── Subjects ──────────────────────────────────────────────────────────────────
export interface Subject {
  id: string
  name: string
  teacherName: string
  currentAvgGrade: number
}

// ── Grades ────────────────────────────────────────────────────────────────────
export type GradeType = 'class' | 'independent' | 'control' | 'thematic' | 'participation' | 'homework' | 'exam' | 'quiz' | 'project'

export interface Grade {
  id: string
  date: string               // ISO
  subjectId: string
  type: GradeType
  value: number              // 1–12
}

// ── Attendance ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late'

export interface AttendanceRecord {
  date: string
  subjectId: string
  status: AttendanceStatus
}

// ── Assignments ───────────────────────────────────────────────────────────────
export type AssignmentType = 'class' | 'independent' | 'control' | 'thematic' | 'homework' | 'participation' | 'exam' | 'quiz' | 'project'
export type AssignmentStatus = 'pending' | 'submitted' | 'reviewed' | 'overdue'

export interface AssignmentFile {
  url: string
  filename: string
  key?: string
}

export interface Assignment {
  id: string
  title: string
  type: AssignmentType
  subjectId: string
  subjectName: string
  teacherName: string
  description: string
  lessonDate: string
  deadline: string
  status: AssignmentStatus
  grade: number | null
  teacherComment: string | null
  submittedFileUrl: string | null
  submittedText: string | null
  assignmentFiles: AssignmentFile[]
  materialsCount: number
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export interface Lesson {
  id: string
  subjectName: string
  subjectId: string | null
  teacherName: string
  startTime: string          // "19:00"
  endTime: string            // "20:30"
  weekDate: string           // ISO date of the specific day
  groupNumber: string
  room: string | null
  isOnline: boolean
}

// ── Materials ─────────────────────────────────────────────────────────────────
export type MaterialType = 'pdf' | 'video' | 'link' | 'image' | 'article' | 'presentation' | 'other'
export type MaterialLanguage = 'ru' | 'en' | 'uz'

export interface Material {
  id: string
  title: string
  subjectId: string
  subjectName: string
  type: MaterialType
  language: MaterialLanguage
  url: string
  uploadedAt: string
}

// ── Achievements ──────────────────────────────────────────────────────────────
export type AchievementCategory = 'academic' | 'attendance' | 'activity' | 'social' | 'special'

export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  icon: string
  rewardStars: number
  rewardCrystals: number
  isUnlocked: boolean
  unlockedAt: string | null
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
export type ActivityEventType =
  | 'stars_earned'
  | 'crystals_earned'
  | 'homework_graded'
  | 'attendance'
  | 'teacher_reply'
  | 'badge_unlocked'

export interface ActivityEvent {
  id: string
  date: string
  type: ActivityEventType
  description: string
  starsAmount: number | null
  crystalsAmount: number | null
  subjectName: string | null
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  rank: number
  studentId: string
  fullName: string
  photo: string | null
  points: number
  isCurrentUser: boolean
}

// ── Payments ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'paid' | 'pending' | 'overdue'

export interface Payment {
  id: string
  amount: number
  paidAmount: number
  currency: string
  status: PaymentStatus
  dueDate: string | null
  paidAt:  string | null
  description: string | null
  method: string | null
  periodNumber: number | null
  contractNumber: string | null
  directionName: string | null
}

export interface ContractPaymentInfo {
  contractId: string
  contractNumber: string | null
  directionName: string | null
  paymentType: string
  paymentAmount: number
  totalExpected: number
  totalPaid: number
  remaining: number
  totalPeriods: number
  paidPeriods: number
  overduePeriods: number
  status: 'ok' | 'has_debt' | 'overdue'
  payments: Payment[]
}

export interface StudentFinanceDashboard {
  totalDebt: number
  totalPaid: number
  overdueCount: number
  upcomingPayment: Payment | null
  contracts: ContractPaymentInfo[]
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export type ContactRole = 'curator' | 'manager' | 'support' | 'teacher' | 'dean' | 'admin'

export interface Contact {
  id: string
  fullName: string
  role: ContactRole
  subject: string | null
  photo: string | null
  email: string
  phone: string | null
  telegram: string | null
}

// ── Performance ───────────────────────────────────────────────────────────────
export interface SubjectPerformance {
  subject: Subject
  level: 'high' | 'medium' | 'low'
  levelDescription: string
  pendingTasks: number
  overdueTasks: number
  attendance: {
    presentPercent: number
    absentPercent: number
    latePercent: number
  }
  grades: Grade[]
  attendanceCalendar: AttendanceRecord[]
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardData {
  student_id: string
  full_name: string
  student_code: string | null
  stars: number
  crystals: number
  total_coins: number
  badge_level: string
  risk_level: string
  gpa: number | null
  attendance_percent: number | null
  pending_assignments: number
  on_time_assignments: number
  total_assignments: number
  overdue_assignments: number
  attendance30d: {
    presentPercent: number
    absentPercent: number
    latePercent: number
  } | null
  recent_grades: Grade[]
}
