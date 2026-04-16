# LMS Module — Frontend Development Plan
## EduPlatform

**Version:** 1.0
**Date:** 2026-04-02
**Based on:** PRD v1.2 (Section 6) + crm/DESIGN.md (shared design system)
**Module:** LMS (Learning Management System)
**Access:** Director (full), MUP / Academic Manager (full), Teacher (own scope only)

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [TypeScript Types & Interfaces](#3-typescript-types--interfaces)
4. [Design Tokens & Tailwind Config](#4-design-tokens--tailwind-config)
5. [State Management](#5-state-management)
6. [Data Layer](#6-data-layer)
7. [Development Phases](#7-development-phases)
8. [Component Reference](#8-component-reference)
9. [API Contract](#9-api-contract)
10. [Edge Cases & Business Logic](#10-edge-cases--business-logic)
11. [Accessibility & Animations](#11-accessibility--animations)

---

## 1. Tech Stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.x | Same as CRM — standalone app in `lms/` |
| Language | TypeScript | 5.x | Strict mode |
| UI Components | shadcn/ui + Radix UI | latest | Shared primitives |
| Styles | Tailwind CSS | 3.x | Same tokens as CRM |
| Server State | TanStack Query | 5.x | Cache, pagination, optimistic updates |
| Client State | Zustand | 4.x | Persist sidebar, filters, active group |
| Forms | React Hook Form + Zod | latest | All forms validated |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | latest | Schedule Kanban, group reorder |
| Charts | Recharts | 2.x | Attendance, grades, risk charts |
| Dates | date-fns | 3.x | Russian locale, lesson windows |
| Icons | Lucide React | latest | Consistent icon set |
| HTTP | Axios | 1.x | Interceptors, JWT attach |
| Toasts | sonner | latest | |
| File upload | react-dropzone | latest | Materials, homework files |

```bash
# Install (from lms/ directory)
npm install --legacy-peer-deps
```

---

## 2. Project Structure

```
lms/
├── package.json
├── next.config.mjs           # .mjs — Next.js 14 requirement
├── tailwind.config.ts        # Same tokens as crm/tailwind.config.ts
├── tsconfig.json
└── src/
    ├── app/
    │   ├── layout.tsx                        # Root layout (fonts, providers)
    │   ├── (auth)/
    │   │   └── login/
    │   │       └── page.tsx                  # Login page
    │   └── (lms)/
    │       ├── layout.tsx                    # LMS Shell: sidebar + topbar + QueryProvider
    │       ├── page.tsx                      # Redirect → /schedule
    │       ├── schedule/
    │       │   └── page.tsx                  # Schedule Kanban (Mon–Sun)
    │       ├── groups/
    │       │   ├── page.tsx                  # Groups list
    │       │   └── [id]/
    │       │       └── page.tsx              # Group detail: students + schedule + stats
    │       ├── students/
    │       │   ├── page.tsx                  # Students list with risk badges
    │       │   └── [id]/
    │       │       └── page.tsx              # Student profile (7 tabs)
    │       ├── lessons/
    │       │   └── [id]/
    │       │       └── page.tsx              # Lesson execution: attendance + grades
    │       ├── homework/
    │       │   └── page.tsx                  # Homework review queue (Teacher)
    │       ├── late-requests/
    │       │   └── page.tsx                  # Late Entry Requests (MUP approval)
    │       ├── tasks/
    │       │   └── page.tsx                  # MUP task board (Kanban)
    │       ├── analytics/
    │       │   └── page.tsx                  # LMS analytics dashboard
    │       ├── compensation/
    │       │   └── page.tsx                  # Teacher compensation (Director/MUP)
    │       └── settings/
    │           ├── page.tsx                  # Settings tabs
    │           └── directions/
    │               └── [id]/
    │                   └── page.tsx          # Direction detail: subjects + groups
    ├── components/
    │   ├── ui/                               # Badge, Button, Input, Dialog, Tabs, Avatar, etc.
    │   ├── shared/                           # EmptyState, ConfirmDialog, FileUpload, Providers
    │   └── lms/
    │       ├── layout/
    │       │   ├── LmsSidebar.tsx
    │       │   └── LmsTopbar.tsx
    │       ├── schedule/
    │       │   ├── ScheduleKanban.tsx        # Mon–Sun columns
    │       │   ├── ScheduleColumn.tsx        # Single day column
    │       │   ├── LessonCard.tsx            # Card in Kanban
    │       │   ├── LessonForm.tsx            # Create/edit lesson modal
    │       │   ├── BulkScheduleForm.tsx      # Recurring schedule generator
    │       │   ├── ConflictAlert.tsx         # Shows detected conflicts
    │       │   └── ScheduleFilters.tsx       # Teacher/Room/Group/Date filters
    │       ├── lessons/
    │       │   ├── AttendanceTable.tsx       # Per-student attendance grid
    │       │   ├── GradeInput.tsx            # 1–10 grade + comment
    │       │   ├── DiamondDistributor.tsx    # Diamond award UI (pool tracker)
    │       │   ├── HomeworkAssignForm.tsx    # Assign HW during lesson
    │       │   ├── MaterialsUpload.tsx       # Files + links section
    │       │   └── LessonStatusBadge.tsx     # Scheduled/InProgress/Conducted/etc.
    │       ├── students/
    │       │   ├── StudentCard.tsx           # Card in list view
    │       │   ├── StudentTable.tsx          # Table view
    │       │   ├── RiskBadge.tsx             # Normal/At Risk/Critical
    │       │   ├── RiskFactors.tsx           # Breakdown of risk factors
    │       │   ├── StudentFilters.tsx        # Direction/Group/Name/Risk filters
    │       │   └── EnrollmentForm.tsx        # Add student to group
    │       ├── student-profile/
    │       │   ├── ProfileHeader.tsx         # Name, photo, risk badge, contacts
    │       │   ├── PersonalInfoTab.tsx
    │       │   ├── AcademicTab.tsx           # Grades, GPA, attendance %
    │       │   ├── GamificationTab.tsx       # Coins, badge, diamond history
    │       │   ├── FinancialTab.tsx          # Payment schedule, debt (read-only in LMS)
    │       │   ├── EnrollmentsTab.tsx        # Active groups + directions
    │       │   └── ActivityLogTab.tsx        # Key events timeline
    │       ├── homework/
    │       │   ├── HomeworkQueue.tsx         # Teacher: submitted homeworks list
    │       │   ├── HomeworkCard.tsx          # Single submission card
    │       │   └── HomeworkReviewForm.tsx    # Grade + feedback modal
    │       ├── late-requests/
    │       │   ├── LateRequestList.tsx       # MUP: pending requests
    │       │   ├── LateRequestCard.tsx       # Single request
    │       │   └── LateRequestReviewForm.tsx # Approve/Reject with comment
    │       ├── tasks/
    │       │   ├── MupTaskKanban.tsx         # Same structure as CRM TaskKanban
    │       │   ├── MupTaskCard.tsx
    │       │   └── MupTaskForm.tsx
    │       ├── analytics/
    │       │   ├── AttendanceChart.tsx       # Line chart: % over time
    │       │   ├── GradeDistribution.tsx     # Bar chart per subject
    │       │   ├── RiskOverview.tsx          # Pie: Normal/At Risk/Critical
    │       │   ├── HomeworkStats.tsx         # Completion rate cards
    │       │   └── TeacherPerformance.tsx    # Table: lessons conducted, incomplete
    │       ├── compensation/
    │       │   ├── CompensationList.tsx      # All teachers + their model
    │       │   ├── CompensationForm.tsx      # Configure model A/B/C + hybrid
    │       │   └── SalaryBreakdown.tsx       # Computed salary preview
    │       └── settings/
    │           ├── DirectionList.tsx
    │           ├── DirectionForm.tsx
    │           ├── SubjectList.tsx
    │           ├── SubjectForm.tsx
    │           ├── GroupList.tsx
    │           ├── GroupForm.tsx
    │           └── RoomList.tsx
    ├── lib/
    │   ├── api/
    │   │   ├── axios.ts                      # Axios instance (same pattern as CRM)
    │   │   └── lms/
    │   │       ├── query-keys.ts             # lmsKeys typed const object
    │   │       ├── auth.ts                   # login, me, logout
    │   │       ├── schedule.ts               # lessons CRUD
    │   │       ├── groups.ts                 # groups + enrollments
    │   │       ├── students.ts               # students CRUD
    │   │       ├── homework.ts               # homework CRUD
    │   │       ├── late-requests.ts          # late entry requests
    │   │       ├── tasks.ts                  # MUP tasks
    │   │       ├── analytics.ts              # LMS analytics
    │   │       ├── compensation.ts           # teacher compensation
    │   │       └── settings.ts              # directions, subjects, rooms
    │   ├── hooks/lms/
    │   │   ├── useSchedule.ts
    │   │   ├── useGroups.ts
    │   │   ├── useStudents.ts
    │   │   ├── useLesson.ts
    │   │   ├── useHomework.ts
    │   │   ├── useLateRequests.ts
    │   │   ├── useMupTasks.ts
    │   │   ├── useAnalytics.ts
    │   │   ├── useCompensation.ts
    │   │   └── useSettings.ts
    │   ├── stores/
    │   │   ├── useAuthStore.ts               # Shared — same shape as CRM
    │   │   └── useLmsStore.ts                # LMS UI state
    │   ├── utils/
    │   │   ├── cn.ts                         # clsx + tailwind-merge
    │   │   ├── dates.ts                      # date-fns with ru locale
    │   │   └── lessonWindow.ts               # isLessonEditable() logic
    │   └── validators/lms/
    │       ├── lesson.schema.ts
    │       ├── attendance.schema.ts
    │       ├── homework.schema.ts
    │       ├── group.schema.ts
    │       └── student.schema.ts
    └── types/lms/
        ├── index.ts                          # re-exports all
        ├── entities.ts                       # all domain types
        ├── api.ts                            # DTOs + PaginatedResponse
        └── filters.ts                        # filter interfaces
```

---

## 3. TypeScript Types & Interfaces

### 3.1 Core Entities (entities.ts)

```typescript
// ─── Users ──────────────────────────────────────────────────────────────────

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

// ─── Educational Structure ──────────────────────────────────────────────────

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
  id:          string
  name:        string
  directionId: string
  direction:   Direction
  subjectId:   string
  subject:     Subject
  teacherId:   string
  teacher:     User
  startDate:   string        // ISO date
  endDate:     string        // ISO date
  isArchived:  boolean
  studentCount: number       // computed
  createdAt:   string
}

export interface Enrollment {
  id:          string
  studentId:   string
  groupId:     string
  group:       Group
  enrolledAt:  string        // ISO date
  transferredFrom?: string   // groupId if transferred
  status:      'active' | 'completed' | 'dropped'
}

// ─── Students ───────────────────────────────────────────────────────────────

export type RiskLevel = 'normal' | 'at_risk' | 'critical'

export type BadgeLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Student {
  id:          string
  fullName:    string
  phone:       string | null
  email:       string | null
  dateOfBirth: string | null  // ISO date
  photoUrl:    string | null
  parentName:  string | null
  parentPhone: string | null
  isActive:    boolean

  // Computed / aggregated
  enrollments:       Enrollment[]
  riskLevel:         RiskLevel
  riskLastUpdated:   string      // ISO datetime — nightly batch
  totalCoins:        number
  badgeLevel:        BadgeLevel
  gpa:               number | null
  attendancePercent: number | null
  createdAt:         string
}

export interface RiskFactors {
  studentId:        string
  attendanceScore:  RiskLevel    // per-factor assessment
  gradesScore:      RiskLevel
  homeworkScore:    RiskLevel
  paymentScore:     RiskLevel
  overallRisk:      RiskLevel
  calculatedAt:     string       // ISO datetime
  details: {
    attendancePercent14d: number
    avgGradeLast5:        number
    missedHomeworkStreak: number
    debtDays:             number
  }
}

// ─── Schedule & Lessons ─────────────────────────────────────────────────────

export type LessonStatus =
  | 'scheduled'    // future lesson
  | 'in_progress'  // today, within time window
  | 'conducted'    // attendance + topic filled, window passed
  | 'incomplete'   // window passed, missing data
  | 'cancelled'    // cancelled by MUP

export type AttendanceStatus = 'on_time' | 'late' | 'absent'

export interface Lesson {
  id:          string
  groupId:     string
  group:       Group
  teacherId:   string
  teacher:     User
  roomId:      string | null
  room:        Room | null
  date:        string     // ISO date YYYY-MM-DD
  startTime:   string     // "HH:mm"
  endTime:     string     // "HH:mm"
  topic:       string | null
  status:      LessonStatus
  isRecurring: boolean    // part of a bulk-created series
  seriesId:    string | null
  cancelReason: string | null
  createdAt:   string
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

export interface HomeworkAssignment {
  id:          string
  lessonId:    string
  groupId:     string
  description: string
  deadline:    string       // ISO date
  materials:   LessonMaterial[]
  createdAt:   string
}

// ─── Homework Submissions ───────────────────────────────────────────────────

export type HomeworkSubmissionStatus = 'not_submitted' | 'submitted' | 'reviewed'

export interface HomeworkSubmission {
  id:             string
  assignmentId:   string
  assignment:     HomeworkAssignment
  studentId:      string
  student:        Student
  status:         HomeworkSubmissionStatus
  submittedAt:    string | null
  files:          LessonMaterial[]
  grade:          number | null
  feedback:       string | null
  reviewedAt:     string | null
  isOverdue:      boolean     // computed: submittedAt > deadline
}

// ─── Late Entry Requests ────────────────────────────────────────────────────

export type LateRequestStatus = 'pending' | 'approved' | 'rejected'

export interface LateEntryRequest {
  id:         string
  lessonId:   string
  lesson:     Lesson
  teacherId:  string
  teacher:    User
  reason:     string
  status:     LateRequestStatus
  reviewedBy: string | null
  reviewer:   User | null
  reviewNote: string | null
  submittedAt: string
  reviewedAt:  string | null
  // If approved — temporary unlock window
  unlockedUntil: string | null  // ISO datetime
}

// ─── Gamification ───────────────────────────────────────────────────────────

export interface CoinTransaction {
  id:        string
  studentId: string
  lessonId:  string
  lesson:    Lesson
  diamonds:  number       // source diamonds
  coins:     number       // diamonds × 10
  awardedAt: string
}

export interface LeaderboardEntry {
  rank:      number
  studentId: string
  fullName:  string
  coins:     number
  badge:     BadgeLevel
}

// ─── Teacher Compensation ───────────────────────────────────────────────────

export type CompensationModelType = 'per_lesson' | 'fixed_monthly' | 'per_student'

export interface CompensationModel {
  id:          string
  teacherId:   string
  type:        CompensationModelType
  isActive:    boolean
  // Model A: per_lesson
  ratePerLesson?: number            // UZS
  subjectId?:     string            // different rate per subject
  subject?:       Subject
  // Model B: fixed_monthly
  fixedMonthlyAmount?: number       // UZS
  proRatePartialMonth?: boolean
  // Model C: per_student
  ratePerStudent?: number           // UZS
  effectiveFrom:   string           // ISO date
  effectiveTo:     string | null    // null = still active
}

export interface SalaryCalculation {
  teacherId:    string
  teacher:      User
  period:       string              // "YYYY-MM"
  models:       SalaryModelResult[]
  totalAmount:  number              // UZS
  isLocked:     boolean
  calculatedAt: string
}

export interface SalaryModelResult {
  modelId:     string
  type:        CompensationModelType
  description: string               // human-readable breakdown
  amount:      number
}

// ─── MUP Tasks ──────────────────────────────────────────────────────────────

export type MupTaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type MupTaskStatus   = 'pending' | 'in_progress' | 'done' | 'overdue'

export interface MupTask {
  id:              string
  title:           string
  description:     string | null
  status:          MupTaskStatus
  priority:        MupTaskPriority
  dueDate:         string
  assignedTo:      string
  assignee:        User
  linkedStudentId: string | null
  linkedStudent:   Student | null
  linkedTeacherId: string | null
  linkedTeacher:   User | null
  isAutoCreated:   boolean
  createdAt:       string
}

// ─── Notifications ──────────────────────────────────────────────────────────

export type LmsNotificationType =
  | 'late_request_submitted'    // MUP: teacher submitted a request
  | 'late_request_reviewed'     // Teacher: MUP approved/rejected
  | 'student_risk_changed'      // MUP/Director: student risk escalated
  | 'homework_overdue'          // Teacher: student didn't submit
  | 'task_due_soon'
  | 'task_overdue'

export interface AppNotification {
  id:        string
  type:      LmsNotificationType
  title:     string
  body:      string
  isRead:    boolean
  createdAt: string
  meta: {
    lessonId?:      string
    studentId?:     string
    requestId?:     string
    taskId?:        string
  }
}
```

### 3.2 DTO Types (api.ts)

```typescript
export interface PaginatedResponse<T> {
  data:       T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

// ─── Lesson DTOs ────────────────────────────────────────────────────────────

export interface CreateLessonDto {
  groupId:   string
  teacherId: string
  roomId?:   string
  date:      string   // YYYY-MM-DD
  startTime: string   // HH:mm
  endTime:   string   // HH:mm
}

export interface BulkCreateLessonsDto {
  groupId:    string
  teacherId:  string
  roomId?:    string
  daysOfWeek: number[]    // 0=Mon … 6=Sun
  startTime:  string
  endTime:    string
  dateFrom:   string      // YYYY-MM-DD
  dateTo:     string      // YYYY-MM-DD
}

export interface ConductLessonDto {
  topic:       string
  attendance:  AttendanceEntry[]
  grades?:     GradeEntry[]
  diamonds?:   DiamondEntry[]
}

export interface AttendanceEntry {
  studentId: string
  status:    AttendanceStatus
  note?:     string
}

export interface GradeEntry {
  studentId: string
  grade:     number
  comment?:  string
}

export interface DiamondEntry {
  studentId: string
  diamonds:  number
}

// ─── Homework DTOs ──────────────────────────────────────────────────────────

export interface CreateHomeworkDto {
  lessonId:    string
  description: string
  deadline:    string     // YYYY-MM-DD
}

export interface ReviewHomeworkDto {
  grade:    number
  feedback: string
}

// ─── Group DTOs ─────────────────────────────────────────────────────────────

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

export interface TransferStudentDto {
  fromGroupId:   string
  toGroupId:     string
  effectiveDate: string
}

// ─── Late Request DTOs ──────────────────────────────────────────────────────

export interface CreateLateRequestDto {
  lessonId: string
  reason:   string
}

export interface ReviewLateRequestDto {
  action:    'approve' | 'reject'
  reviewNote: string
}
```

### 3.3 Filter Types (filters.ts)

```typescript
export interface ScheduleFilters {
  teacherId?:   string
  roomId?:      string
  groupId?:     string
  directionId?: string
  weekStart:    string     // ISO date — Monday of current week
}

export interface StudentFilters {
  search:      string
  directionId: string | null
  groupId:     string | null
  riskLevel:   RiskLevel | null
  isActive:    boolean
}

export interface HomeworkFilters {
  groupId?:   string
  subjectId?: string
  status?:    HomeworkSubmissionStatus
}

export interface LmsAnalyticsPeriod {
  type: 'week' | 'month' | 'quarter' | 'custom'
  from?: string
  to?:   string
}
```

---

## 4. Design Tokens & Tailwind Config

Identical token set to `crm/tailwind.config.ts`. Copy exactly, extend with LMS-specific additions:

```typescript
// Additional tokens for LMS:
colors: {
  // Lesson status colors
  lesson: {
    scheduled:  '#6366F1',   // primary-500
    inProgress: '#F59E0B',   // warning-500
    conducted:  '#10B981',   // success-500
    incomplete: '#EF4444',   // danger-500
    cancelled:  '#9CA3AF',   // gray-400
  },
  // Risk level colors
  risk: {
    normal:   '#10B981',     // success-500
    at_risk:  '#F59E0B',     // warning-500
    critical: '#EF4444',     // danger-500
  },
  // Diamond color
  diamond: '#6366F1',
  coin:    '#F59E0B',
  // Badge levels
  badge: {
    bronze:   '#B45309',
    silver:   '#6B7280',
    gold:     '#D97706',
    platinum: '#7C3AED',
  },
}
```

### LMS-specific component sizes

| Component | Value |
|---|---|
| Schedule column width | 220px |
| Lesson card height | auto (min 80px) |
| Student avatar (profile) | 96px |
| Diamond icon size | 20px |
| Risk badge height | 24px |

---

## 5. State Management

### 5.1 useAuthStore (shared with CRM — same shape)

```typescript
interface AuthStore {
  user:            User | null
  token:           string | null
  isAuthenticated: boolean
  setAuth:         (user: User, token: string) => void
  logout:          () => void
}

// Selectors
export const useIsDirector = () => useAuthStore((s) => s.user?.role === 'director')
export const useIsMup      = () => useAuthStore((s) => s.user?.role === 'mup')
export const useIsTeacher  = () => useAuthStore((s) => s.user?.role === 'teacher')
export const useCurrentUser = () => useAuthStore((s) => s.user)
```

### 5.2 useLmsStore

```typescript
interface LmsStore {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar:    () => void

  // Schedule
  scheduleFilters:    ScheduleFilters
  setScheduleFilter:  <K extends keyof ScheduleFilters>(k: K, v: ScheduleFilters[K]) => void
  activeWeekStart:    string      // ISO date — Monday of displayed week
  setActiveWeekStart: (d: string) => void
  scheduleColorBy:    'direction' | 'subject'
  setScheduleColorBy: (v: 'direction' | 'subject') => void

  // Students
  studentFilters:     StudentFilters
  setStudentFilter:   <K extends keyof StudentFilters>(k: K, v: StudentFilters[K]) => void
  studentsView:       'table' | 'cards'
  setStudentsView:    (v: 'table' | 'cards') => void

  // Homework
  homeworkFilters:    HomeworkFilters
  setHomeworkFilter:  <K extends keyof HomeworkFilters>(k: K, v: HomeworkFilters[K]) => void

  // Analytics
  analyticsPeriod:    LmsAnalyticsPeriod
  setAnalyticsPeriod: (p: LmsAnalyticsPeriod) => void
}

// Persisted: sidebarCollapsed, scheduleColorBy, studentsView, analyticsPeriod
```

---

## 6. Data Layer

### 6.1 Query Keys (query-keys.ts)

```typescript
export const lmsKeys = {
  // Schedule
  lessons:     (filters: ScheduleFilters) => ['lms', 'lessons', filters] as const,
  lesson:      (id: string)               => ['lms', 'lessons', id] as const,

  // Groups
  groups:      (params?: any)             => ['lms', 'groups', params] as const,
  group:       (id: string)               => ['lms', 'groups', id] as const,
  groupStudents: (id: string)             => ['lms', 'groups', id, 'students'] as const,

  // Students
  students:    (filters: any)             => ['lms', 'students', filters] as const,
  student:     (id: string)              => ['lms', 'students', id] as const,
  riskFactors: (id: string)              => ['lms', 'students', id, 'risk'] as const,

  // Homework
  homeworkQueue: (filters: HomeworkFilters) => ['lms', 'homework', filters] as const,
  submission:    (id: string)               => ['lms', 'homework', 'submissions', id] as const,

  // Late Requests
  lateRequests:  (status?: LateRequestStatus) => ['lms', 'late-requests', status] as const,
  lateRequest:   (id: string)                 => ['lms', 'late-requests', id] as const,

  // Tasks
  mupTasks:    (params?: any)  => ['lms', 'tasks', params] as const,

  // Analytics
  analytics: {
    attendance:   (p: LmsAnalyticsPeriod) => ['lms', 'analytics', 'attendance',   p] as const,
    grades:       (p: LmsAnalyticsPeriod) => ['lms', 'analytics', 'grades',       p] as const,
    risk:         ()                      => ['lms', 'analytics', 'risk'] as const,
    homework:     (p: LmsAnalyticsPeriod) => ['lms', 'analytics', 'homework',     p] as const,
    teachers:     (p: LmsAnalyticsPeriod) => ['lms', 'analytics', 'teachers',     p] as const,
  },

  // Compensation
  compensation:  (teacherId?: string) => ['lms', 'compensation', teacherId] as const,
  salaryCalc:    (period: string)     => ['lms', 'salary', period] as const,

  // Settings
  directions:  () => ['lms', 'directions'] as const,
  subjects:    (directionId?: string) => ['lms', 'subjects', directionId] as const,
  rooms:       () => ['lms', 'rooms'] as const,
  teachers:    () => ['lms', 'teachers'] as const,

  notifications: () => ['lms', 'notifications'] as const,
}
```

### 6.2 Key Hooks

```typescript
// ── Schedule ──────────────────────────────────────────────────────────────
export function useSchedule(filters: ScheduleFilters) {
  return useQuery({
    queryKey: lmsKeys.lessons(filters),
    queryFn:  () => scheduleApi.list(filters),
    staleTime: 30_000,
  })
}

export function useCreateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateLessonDto) => scheduleApi.create(dto),
    // Conflicts are validated server-side; show error toast on 422
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['lms', 'lessons'] }),
    onError: (err: any) => {
      const conflict = err?.response?.data
      if (conflict?.code === 'SCHEDULE_CONFLICT') {
        // Show ConflictAlert with conflict details
        toast.error(`Конфликт: ${conflict.message}`)
      } else {
        toast.error('Не удалось создать урок')
      }
    },
  })
}

// ── Lesson execution ──────────────────────────────────────────────────────
export function useConductLesson(lessonId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: ConductLessonDto) => scheduleApi.conduct(lessonId, dto),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: lmsKeys.lesson(lessonId) })
      toast.success('Урок проведён')
    },
    onError: (err: any) => {
      if (err?.response?.status === 403) {
        toast.error('Окно ввода закрыто. Подайте запрос на позднее внесение.')
      } else {
        toast.error('Ошибка при сохранении урока')
      }
    },
  })
}

// ── Students ──────────────────────────────────────────────────────────────
export function useStudents(filters: StudentFilters) {
  return useQuery({
    queryKey: lmsKeys.students(filters),
    queryFn:  () => studentsApi.list(filters),
    staleTime: 60_000,
  })
}

// ── Late Requests ─────────────────────────────────────────────────────────
export function useLateRequests(status?: LateRequestStatus) {
  return useQuery({
    queryKey: lmsKeys.lateRequests(status),
    queryFn:  () => lateRequestsApi.list(status),
    staleTime: 30_000,
  })
}

export function useReviewLateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReviewLateRequestDto }) =>
      lateRequestsApi.review(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'late-requests'] })
      toast.success('Запрос обработан')
    },
  })
}
```

---

## 7. Development Phases

### Phase 1 — Base Layout & Auth ✅ TODO

**Goal:** Working shell with navigation, login, route guards

**Tasks:**
- [ ] `lms/` Next.js 14 project scaffolding (copy structure from `crm/`)
- [ ] `tailwind.config.ts` — same tokens + LMS additions
- [ ] `useAuthStore` — identical to CRM
- [ ] Login page — `(auth)/login/page.tsx`
- [ ] `(lms)/layout.tsx` — LmsSidebar + LmsTopbar + QueryProvider + route guard
- [ ] `LmsSidebar` — role-sensitive nav items
- [ ] `LmsTopbar` — notifications bell, user menu, avatar
- [ ] Axios instance with JWT attach + 401 redirect

**Sidebar nav by role:**

| Item | Director | MUP | Teacher |
|---|---|---|---|
| Расписание | ✅ | ✅ | ✅ |
| Группы | ✅ | ✅ | ✅ (own only) |
| Студенты | ✅ | ✅ | ✅ (own groups) |
| Домашние задания | ✅ | ✅ | ✅ |
| Поздние запросы | ✅ | ✅ | ✅ (own) |
| Задачи МУП | ✅ | ✅ | ❌ |
| Аналитика | ✅ | ✅ | ❌ |
| Компенсации | ✅ | ✅ | ❌ |
| Настройки | ✅ | ✅ | ❌ |

---

### Phase 2 — Settings (Directions, Subjects, Groups, Rooms)

**Goal:** Управление учебной структурой (директор + МУП)

**Tasks:**
- [ ] Settings page with tabs: Направления / Предметы / Группы / Кабинеты
- [ ] `DirectionList` + `DirectionForm` (name, color picker, description)
- [ ] `SubjectList` + `SubjectForm` (name, direction select)
- [ ] `GroupList` + `GroupForm` (name, direction, subject, teacher, start/end dates)
- [ ] `GroupDetail` page — enrolled students table, upcoming lessons preview
- [ ] `RoomList` — simple CRUD (name, capacity)
- [ ] `useSettings` hooks: `useDirections`, `useSubjects`, `useGroups`, `useRooms`, `useTeachers`
- [ ] `EnrollStudentForm` — add student to group with conflict check
- [ ] Group archive confirm dialog

**Key components:**

```typescript
// GroupForm props
interface GroupFormProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  group?:        Group        // edit mode
  onSave:        (dto: CreateGroupDto) => void
  isPending:     boolean
}

// Teacher select — fetches GET /lms/users?role=teacher
// Direction select → filters Subject select reactively
```

---

### Phase 3 — Schedule Management (Kanban)

**Goal:** Полное управление расписанием с конфликт-детектором

**Tasks:**
- [ ] `ScheduleKanban` — 7 columns (Пн–Вс), scrollable
- [ ] `ScheduleColumn` — day header + time-sorted lesson cards
- [ ] `LessonCard` — group name, time, teacher, room, status badge; colored by direction
- [ ] `LessonForm` modal — single lesson create/edit
  - Direction → Subject → Group cascade selects
  - Teacher select (filtered by subject)
  - Room select (with availability check)
  - Date + start/end time
  - Conflict detection: show `ConflictAlert` on 422 response
- [ ] `BulkScheduleForm` modal — recurring schedule
  - Days of week checkboxes (Пн–Вс)
  - Time slot
  - Date range picker
  - Preview: "Будет создано N уроков"
- [ ] `ConflictAlert` component — lists conflicting teacher/room/students by name
- [ ] `ScheduleFilters` bar — Teacher / Room / Group / Direction dropdowns + week navigation
- [ ] Week navigation (← previous / → next week) + "Today" button
- [ ] Cancel lesson action (MUP/Director only) with reason
- [ ] `useSchedule(filters)` — fetches all lessons for displayed week range

**ScheduleKanban layout:**

```
┌──────────────────────────────────────────────────────┐
│  ◀ 31 мар – 6 апр 2026  ▶    [Сегодня]   [Фильтры]  │
├──────┬──────┬──────┬──────┬──────┬──────┬────────────┤
│  Пн  │  Вт  │  Ср  │  Чт  │  Пт  │  Сб  │     Вс     │
│ 31   │  1   │  2   │  3   │  4   │  5   │      6     │
├──────┼──────┼──────┼──────┼──────┼──────┼────────────┤
│[card]│      │[card]│      │[card]│      │            │
│[card]│[card]│      │[card]│      │      │            │
│      │      │[card]│      │      │      │            │
│  ➕  │  ➕  │  ➕  │  ➕  │  ➕  │  ➕  │     ➕      │
└──────┴──────┴──────┴──────┴──────┴──────┴────────────┘
```

---

### Phase 4 — Lesson Execution (Attendance + Grades + Diamonds)

**Goal:** Учитель проводит урок — ввод посещаемости, оценок, бриллиантов, ДЗ

**Tasks:**
- [ ] `LessonDetail` page — full lesson view
- [ ] `LessonStatusBadge` — color-coded (5 states)
- [ ] `isLessonEditable()` utility:
  ```typescript
  export function isLessonEditable(lesson: Lesson): boolean {
    if (lesson.status === 'cancelled') return false
    const today = format(new Date(), 'yyyy-MM-dd')
    if (lesson.date !== today) return false
    const now = new Date()
    const endOfDay = endOfDay(new Date()) // 23:59:59
    return now <= endOfDay
  }
  ```
- [ ] `AttendanceTable` — student list with radio buttons (Вовремя / Опоздал / Отсутствует)
- [ ] `GradeInput` — numeric input 1–10; if < 6: comment textarea appears (required)
- [ ] `DiamondDistributor`:
  - Shows pool: `◆◆◆◆◆` remaining diamonds (5 total)
  - Per student: `◆ 0 / ◆ 1 / ◆ 2 / ◆ 3` selector (max 3)
  - Real-time pool counter updates as teacher distributes
  - Blocks if total > 5
- [ ] Lesson Topic text area (required to mark as Conducted)
- [ ] `MaterialsUpload` — file dropzone (react-dropzone, max 200 MB) + URL input
- [ ] `HomeworkAssignForm` — description + deadline + optional files
- [ ] Save button → `POST /lms/lessons/:id/conduct`
- [ ] Late Entry Request flow:
  - If `!isLessonEditable(lesson) && lesson.status === 'incomplete'`:
  - Show "Подать запрос на позднее внесение" button
  - Opens `LateRequestForm` (reason textarea)
  - After submit: lesson shows "Запрос подан" state
  - If approved: lesson becomes editable again (until `unlockedUntil`)

**Diamond distributor logic:**

```typescript
const totalPool = 5
const maxPerStudent = 3

// Computed: remaining = totalPool - sum(all diamonds)
// Constraint: cannot assign if remaining < newValue - oldValue
// Visual: diamonds shown as filled/empty icons
```

---

### Phase 5 — Students & Late Entry Requests

**Goal:** Управление студентами, профили, риск-система, запросы на поздний ввод

**Tasks:**

**Students:**
- [ ] `StudentsPage` — table + card view toggle
- [ ] `StudentFilters` bar: search / direction / group / risk level filter
- [ ] `RiskBadge` component — colored dot + label (Normal / At Risk / Critical)
- [ ] `StudentTable` — columns: Name, Phone, Groups, Risk, Coins, Badge, Actions
- [ ] `StudentCard` — card view with photo placeholder, risk colored border
- [ ] `StudentProfile` page — 7 tabs:
  1. **Личные данные** — name, contacts, parent, DOB, photo upload
  2. **Академическая** — GPA, attendance %, grades chart per subject
  3. **Геймификация** — total coins, badge, diamond history table
  4. **Финансы** — payment schedule (read-only from LMS; edit in Finance module)
  5. **Зачисления** — active enrollments, transfer history
  6. **Риск-факторы** — `RiskFactors` breakdown card (updated nightly, shows `riskLastUpdated`)
  7. **Журнал событий** — activity log timeline

**Late Entry Requests:**
- [ ] `LateRequestsPage` — split: Teacher view (own requests) / MUP view (incoming queue)
- [ ] Teacher: "Мои запросы" — list with status badges
- [ ] MUP: "На рассмотрении" tab (pending count badge in sidebar)
- [ ] `LateRequestCard` — lesson info, teacher name, reason, submitted at
- [ ] `LateRequestReviewForm` — Approve / Reject radio + comment textarea
- [ ] After approval: teacher sees "Доступ открыт до [time]" banner on lesson page

**Risk system UI rules:**
- Risk is **read-only** on the frontend — recalculated nightly
- Show `riskLastUpdated` timestamp: "Обновлено вчера в 02:00"
- Never show a "recalculate" button (backend-only batch)
- Risk factors breakdown shows exact numbers (attendancePercent14d, avgGradeLast5, etc.)

---

### Phase 6 — Analytics, Compensation & Reporting

**Goal:** Аналитика успеваемости и компенсации учителей

**Tasks:**

**Analytics:**
- [ ] `AnalyticsPage` — period picker + role-filtered widgets
- [ ] `AttendanceChart` — line chart: attendance % over time per group/direction
- [ ] `GradeDistribution` — bar chart: grade distribution per subject
- [ ] `RiskOverview` — pie chart: Normal/At Risk/Critical counts
- [ ] `HomeworkStats` — cards: total assigned / submitted / reviewed / overdue
- [ ] `TeacherPerformance` — table: lessons conducted, incomplete, late-request rate

**Compensation:**
- [ ] `CompensationPage` — list of all teachers + their active models
- [ ] `CompensationForm` — multi-model configurator:
  - Add Model A: subject select + rate input (repeatable per subject)
  - Add Model B: fixed amount + pro-rate toggle
  - Add Model C: rate per student
  - Hybrid: multiple models active simultaneously
  - `effectiveFrom` date (cannot be past)
- [ ] `SalaryBreakdown` — computed preview: "За апрель 2026: X сум"
  - Shows breakdown per model
- [ ] Model change history table (read-only)
- [ ] Director: trigger salary calculation for a period button

**Reporting (within existing pages):**
- [ ] Group detail → Attendance summary table per lesson
- [ ] Student profile → Worked hours widget (teacher's own view)
- [ ] Teacher's own salary breakdown (in profile or separate `/my-salary` page)

---

## 8. Component Reference

### LessonCard

```typescript
interface LessonCardProps {
  lesson:   Lesson
  colorBy:  'direction' | 'subject'
  onClick:  () => void
  onEdit?:  () => void         // MUP/Director only
  onCancel?: () => void        // MUP/Director only
}

// States:
// - Default: colored border (direction/subject color), group + time + teacher
// - Today + editable: pulsing green dot "Идёт сейчас"
// - Conducted: check icon, muted colors
// - Incomplete: warning icon, danger border
// - Cancelled: strikethrough, gray
```

### AttendanceTable

```typescript
interface AttendanceTableProps {
  students:    Student[]
  values:      Record<string, AttendanceStatus>  // studentId → status
  onChange:    (studentId: string, status: AttendanceStatus) => void
  readOnly?:   boolean
}
// Keyboard: Tab navigates between rows, Space/Enter cycles through statuses
```

### DiamondDistributor

```typescript
interface DiamondDistributorProps {
  students:  Student[]
  values:    Record<string, number>   // studentId → diamonds
  onChange:  (studentId: string, diamonds: number) => void
  readOnly?: boolean
}
// Pool counter: shows remaining diamonds visually
// Constraint enforced: max 3 per student, total 5
```

### RiskBadge

```typescript
interface RiskBadgeProps {
  level:      RiskLevel
  showLabel?: boolean
  size?:      'sm' | 'md'
}
// normal   → green dot + "Норма"
// at_risk  → yellow dot + "Риск"
// critical → red pulsing dot + "Критично"
```

### ConflictAlert

```typescript
interface ConflictAlertProps {
  conflicts: {
    type:    'teacher' | 'room' | 'student'
    name:    string
    details: string   // e.g. "занят: 10:00–11:30, Группа React-01"
  }[]
}
// Shows inside LessonForm below submit button
// Each conflict type has distinct icon
```

---

## 9. API Contract

### Schedule

```
GET    /lms/lessons                  — list (week range + filters)
POST   /lms/lessons                  — create single lesson
POST   /lms/lessons/bulk             — bulk create recurring schedule
GET    /lms/lessons/:id              — single lesson detail
PATCH  /lms/lessons/:id              — update (MUP/Director only)
DELETE /lms/lessons/:id              — delete (MUP/Director only)
POST   /lms/lessons/:id/conduct      — submit attendance + grades + diamonds
POST   /lms/lessons/:id/cancel       — cancel lesson { reason }
POST   /lms/lessons/:id/materials    — upload material (multipart/form-data)
DELETE /lms/lessons/:id/materials/:materialId
```

**Conflict detection response (422):**
```json
{
  "code": "SCHEDULE_CONFLICT",
  "message": "Найдены конфликты в расписании",
  "conflicts": [
    { "type": "teacher", "name": "Алишер Каримов", "details": "занят 10:00–11:30 в Группе HTML-01" },
    { "type": "student", "name": "Анвар Камалов",  "details": "занят в группе React-02 в то же время" }
  ]
}
```

### Groups

```
GET    /lms/groups                   — list (filterable)
POST   /lms/groups                   — create
GET    /lms/groups/:id               — detail + students + upcoming lessons
PATCH  /lms/groups/:id               — update
POST   /lms/groups/:id/archive       — archive
POST   /lms/groups/:id/enroll        — enroll student { studentId }
POST   /lms/groups/:id/transfer      — transfer student { fromGroupId, toGroupId, effectiveDate }
DELETE /lms/groups/:id/students/:studentId — unenroll
```

### Students

```
GET    /lms/students                  — list (search + filters)
POST   /lms/students                  — create
GET    /lms/students/:id              — full profile
PATCH  /lms/students/:id              — update
GET    /lms/students/:id/risk         — risk factors breakdown
GET    /lms/students/:id/grades       — grades history
GET    /lms/students/:id/attendance   — attendance history
GET    /lms/students/:id/coins        — coin/diamond transaction history
GET    /lms/students/:id/leaderboard  — position in group/direction leaderboard
```

### Homework

```
GET    /lms/homework                         — teacher's homework queue (submissions)
POST   /lms/lessons/:id/homework             — assign homework to lesson
GET    /lms/homework/submissions/:id         — single submission detail
POST   /lms/homework/submissions/:id/review  — grade + feedback { grade, feedback }
GET    /lms/homework/assignments             — all assignments (filterable)
```

### Late Entry Requests

```
GET    /lms/late-requests             — list (pending | all) — MUP/Director
POST   /lms/late-requests             — submit request { lessonId, reason } — Teacher
GET    /lms/late-requests/:id         — detail
POST   /lms/late-requests/:id/review  — approve/reject { action, reviewNote } — MUP/Director
```

### MUP Tasks

```
GET    /lms/tasks       — list (with filters)
POST   /lms/tasks       — create
PATCH  /lms/tasks/:id   — update
DELETE /lms/tasks/:id   — delete
POST   /lms/tasks/:id/move  — move status { status }
```

### Analytics

```
GET /lms/analytics/attendance    — attendance % over time
GET /lms/analytics/grades        — grade distribution per subject
GET /lms/analytics/risk          — risk overview (counts per level)
GET /lms/analytics/homework      — homework completion stats
GET /lms/analytics/teachers      — teacher performance stats
```

### Compensation

```
GET    /lms/compensation             — all teachers + models (Director/MUP)
GET    /lms/compensation/:teacherId  — teacher's compensation detail
POST   /lms/compensation/:teacherId/models    — add model
PATCH  /lms/compensation/:teacherId/models/:id — update model
DELETE /lms/compensation/:teacherId/models/:id — remove model
GET    /lms/compensation/:teacherId/salary-preview?period=2026-04 — computed preview
POST   /lms/salary/calculate         — trigger salary calculation { period } — Director only
GET    /lms/salary/:period           — salary report for period
```

### Settings

```
GET/POST         /lms/directions
PATCH/DELETE     /lms/directions/:id
GET/POST         /lms/subjects
PATCH/DELETE     /lms/subjects/:id
GET/POST         /lms/rooms
PATCH/DELETE     /lms/rooms/:id
GET              /lms/users?role=teacher   — teacher list for selects
```

### Notifications (shared, no /lms prefix)

```
GET  /notifications           — current user's notifications
POST /notifications/:id/read
POST /notifications/read-all
```

---

## 10. Edge Cases & Business Logic

### 10.1 Lesson Editing Window

```
Rule: Teacher can only fill attendance/grades on the SAME DAY as the lesson
      Window: lesson.startTime → 23:59:59 of lesson.date

Frontend guard (isLessonEditable):
  - Compare lesson.date with today's date (not datetime)
  - If lesson.date === today AND lesson.status !== 'cancelled' → editable
  - If window has passed → show "Late Entry Request" option instead

Backend enforces this too — frontend is UX-only guard.
```

### 10.2 Late Entry Request Flow

```
State machine:
  lesson.status = 'incomplete'
    ↓ Teacher clicks "Подать запрос"
  lateRequest.status = 'pending'
  lesson shows: "Запрос на рассмотрении у МУП"
    ↓ MUP approves
  lateRequest.status = 'approved'
  lateRequest.unlockedUntil = now + 24h (configurable)
  lesson becomes editable again
    ↓ Teacher submits → lesson.status = 'conducted'
  (OR)
    ↓ MUP rejects
  lateRequest.status = 'rejected'
  lesson.status remains 'incomplete'

UI:
  - Banner on lesson page showing request status
  - If approved: countdown timer "Доступ открыт ещё 18 ч"
  - MUP badge in sidebar: pending requests count
```

### 10.3 Schedule Conflict Detection

```
Conflict types (checked server-side on create/update):
  1. Teacher conflict: teacher has another lesson at overlapping time
  2. Room conflict: room is booked at overlapping time
  3. Student conflict: any student in this group has a lesson in another group
                       at the same time (cross-direction enrollment conflict)

Frontend behavior:
  - POST /lms/lessons returns 422 with conflict array
  - LessonForm shows ConflictAlert component with details
  - Form stays open (user must change time/teacher/room)
  - No optimistic update for lesson creation
```

### 10.4 Diamond Pool Constraint

```
Per lesson:
  - Total pool: 5 diamonds
  - Max per student: 3 diamonds

Frontend validation (real-time):
  - Track remaining = 5 - sum(all assigned)
  - Disable "+" button when remaining = 0
  - Disable "+" button when student already has 3
  - Show remaining pool visually: ◆◆◆◆◆ → ◆◆◆○○

This is also enforced server-side.
```

### 10.5 Risk System (Read-Only Frontend)

```
Risk score is calculated by nightly batch (2:00 AM).
Frontend rules:
  - Never show a "Пересчитать" button
  - Always show riskLastUpdated timestamp
  - If riskLastUpdated > 24h ago: show warning "Данные могут быть устаревшими"
  - Risk factors breakdown is read-only display
  - Risk changes trigger notifications (handled by backend)
```

### 10.6 Grade < 6 Requires Comment

```
GradeInput behavior:
  - Value: 1–10 numeric input
  - If value < 6 AND value is set:
    - Show comment textarea (required)
    - Red border until comment filled
    - Cannot submit lesson without comment for grade < 6
  - Form-level validation via Zod:
    grades: z.array(z.object({
      studentId: z.string(),
      grade:     z.number().min(1).max(10),
      comment:   z.string().optional(),
    })).superRefine((grades, ctx) => {
      grades.forEach((g, i) => {
        if (g.grade < 6 && !g.comment?.trim()) {
          ctx.addIssue({ path: [i, 'comment'], message: 'Комментарий обязателен' })
        }
      })
    })
```

### 10.7 Compensation Model Changes

```
Rules:
  - Changes take effect from the NEXT month (cannot be backdated)
  - effectiveFrom is automatically set to first day of next month
  - Old model gets effectiveTo = last day of current month
  - History is kept — never delete old models
  - Frontend shows: current models + inactive (collapsed) history
```

---

## 11. Accessibility & Animations

### Accessibility

| Requirement | Implementation |
|---|---|
| Keyboard navigation in AttendanceTable | Tab → rows, Space/Enter → cycle status |
| Schedule Kanban | Arrow keys navigate between cards, Enter opens detail |
| All modals | Trap focus, Escape closes, `role="dialog"` |
| Risk badges | `aria-label="Статус риска: Критично"` |
| Grade inputs | `aria-label="Оценка для [студент]"`, numeric keyboard |
| Diamond selector | `aria-label="Бриллиантов: 2 из 3 максимум"` |
| Color coding | Never rely on color alone — always include text/icon |

### Animations

```typescript
// Shared with CRM — same animate-* classes in tailwind.config.ts
animate-fade-in:        { opacity: 0→1, duration: 200ms }
animate-scale-in:       { scale: 0.95→1, opacity 0→1, duration: 150ms }
animate-slide-in-right: { translateX: 20px→0, duration: 250ms }

// LMS-specific
animate-pulse-ring:     { ring pulse for "In Progress" lesson (today) }
animate-diamond-pop:    { scale 1→1.3→1, 300ms — when diamond awarded }
animate-risk-change:    { background flash warning/danger — when risk badge updates }

// Page transitions: fade-in on route change
// Kanban column: smooth scroll when week changes
// Lesson card status change: cross-fade between status badges
```

### Loading skeletons

```
ScheduleKanban:  7 columns × 3 card skeletons
StudentTable:    5 row skeletons
LessonDetail:    AttendanceTable skeleton (3 rows)
StudentProfile:  Header + tab content skeleton
```
