// @ts-nocheck
// ─── Demo mock data for EduPlatform LMS ─────────���──────────────────��─────────
// Fictional education center «��кадемияПро»

import type {
  User, Direction, Subject, Room, Group, Student, Lesson,
  AttendanceRecord, GradeRecord, DiamondRecord, HomeworkAssignment,
  HomeworkSubmission, LateEntryRequest, MupTask, AppNotification,
  CompensationModel, LmsAnalyticsOverview, AttendanceStat, RiskFactors,
  TeacherPerformanceStat, GradeDistributionItem, Exam,
} from '@/types/lms'
import { format, addDays, subDays, startOfWeek } from 'date-fns'

// ── Users ────────────────────────────────────────────────────────────────────

export const DEMO_DIRECTOR: User = {
  id: 'u1', name: 'Алексей Директоров', email: 'director@demo.ru',
  role: 'director', avatarUrl: null,
}

export const DEMO_MUP: User = {
  id: 'u2', name: 'Зарина Касымова', email: 'mup@demo.ru',
  role: 'mup', avatarUrl: null,
}

export const DEMO_TEACHER_1: User = {
  id: 'u3', name: 'Асель Нурланова', email: 'teacher1@demo.ru',
  role: 'teacher', avatarUrl: null,
}

export const DEMO_TEACHER_2: User = {
  id: 'u4', name: 'Марат Ибрагимов', email: 'teacher2@demo.ru',
  role: 'teacher', avatarUrl: null,
}

export const DEMO_USERS: User[] = [DEMO_DIRECTOR, DEMO_MUP, DEMO_TEACHER_1, DEMO_TEACHER_2]
export const DEMO_TOKEN = 'demo-token-lms'

// ── Directions ───────────────────────────────────────────────────────────────

export const DEMO_DIRECTIONS: Direction[] = [
  { id: 'd1', name: 'Математика', description: 'Подготовка к ЕГЭ/ОГЭ', color: '#6366F1', isArchived: false, subjectCount: 2, groupCount: 3, createdAt: '2025-09-01T00:00:00Z' },
  { id: 'd2', name: 'Английский язык', description: 'Разговорный + грамматика', color: '#3B82F6', isArchived: false, subjectCount: 3, groupCount: 4, createdAt: '2025-09-01T00:00:00Z' },
  { id: 'd3', name: 'Программирование', description: 'Python, JS, веб', color: '#10B981', isArchived: false, subjectCount: 2, groupCount: 2, createdAt: '2025-09-01T00:00:00Z' },
  { id: 'd4', name: 'Подготовка к школе', description: 'Для детей 5–7 лет', color: '#F59E0B', isArchived: false, subjectCount: 1, groupCount: 2, createdAt: '2025-09-01T00:00:00Z' },
]

// ── Subjects ─────────────────────────────────────────────────────────────────

export const DEMO_SUBJECTS: Subject[] = [
  { id: 'sub1', directionId: 'd1', direction: DEMO_DIRECTIONS[0], name: 'Алгебра', description: null, isArchived: false },
  { id: 'sub2', directionId: 'd1', direction: DEMO_DIRECTIONS[0], name: 'Геометрия', description: null, isArchived: false },
  { id: 'sub3', directionId: 'd2', direction: DEMO_DIRECTIONS[1], name: 'Разговорный английский', description: null, isArchived: false },
  { id: 'sub4', directionId: 'd2', direction: DEMO_DIRECTIONS[1], name: 'IELTS подготовка', description: null, isArchived: false },
  { id: 'sub5', directionId: 'd3', direction: DEMO_DIRECTIONS[2], name: 'Python', description: null, isArchived: false },
  { id: 'sub6', directionId: 'd3', direction: DEMO_DIRECTIONS[2], name: 'JavaScript', description: null, isArchived: false },
]

// ── Rooms ────────────────────────────────────────────────────────────────────

export const DEMO_ROOMS: Room[] = [
  { id: 'r1', name: 'Кабинет 101', capacity: 12, isActive: true },
  { id: 'r2', name: 'Кабинет 102', capacity: 8, isActive: true },
  { id: 'r3', name: 'Компьютерный класс', capacity: 15, isActive: true },
  { id: 'r4', name: 'Кабинет 201', capacity: 10, isActive: true },
]

// ── Groups ───────────────────────────────────────────────────────────────────

export const DEMO_GROUPS: Group[] = [
  {
    id: 'g1', name: 'Алгебра 9А', directionId: 'd1', directionName: 'Математика', roomId: 'r1',
    startDate: '2025-09-01', endDate: '2026-06-30',
    schedule: null, isActive: true, studentCount: 8,
  },
  {
    id: 'g2', name: 'English Advanced', directionId: 'd2', directionName: 'Английский язык', roomId: 'r2',
    startDate: '2025-09-01', endDate: '2026-06-30',
    schedule: null, isActive: true, studentCount: 6,
  },
  {
    id: 'g3', name: 'Python Starter', directionId: 'd3', directionName: 'Программирование', roomId: 'r3',
    startDate: '2026-01-10', endDate: '2026-07-31',
    schedule: null, isActive: true, studentCount: 5,
  },
  {
    id: 'g4', name: 'IELTS 7.0+', directionId: 'd2', directionName: 'Английский язык', roomId: 'r1',
    startDate: '2026-02-01', endDate: '2026-08-31',
    schedule: null, isActive: true, studentCount: 4,
  },
]

// ── Students ──────────────────────────────────────────────────────────────────

const mkStudent = (
  id: string, fullName: string, phone: string,
  riskLevel: Student['riskLevel'] = 'low',
  extra?: Partial<Student>
): Student => ({
  id, fullName, phone,
  email:       `${id}@student.demo`,
  dateOfBirth: '2010-05-15',
  photoUrl:    null,
  parentName:  'Родитель',
  parentPhone: '+7 700 000 0000',
  isActive:    true,
  enrollments: [],
  riskLevel,
  riskLastUpdated: '2026-04-02T02:00:00Z',
  totalCoins:  riskLevel === 'low' ? 120 : riskLevel === 'medium' ? 40 : 10,
  badgeLevel:  riskLevel === 'low' ? 'bronze' : 'bronze',
  gpa:         riskLevel === 'low' ? 7.8 : riskLevel === 'medium' ? 5.2 : 3.1,
  attendancePercent: riskLevel === 'low' ? 92 : riskLevel === 'medium' ? 65 : 48,
  createdAt:   '2025-09-01T00:00:00Z',
  ...extra,
})

export const DEMO_STUDENTS: Student[] = [
  mkStudent('st1', 'Айгерим Сейткали',   '+7 701 234 56 78', 'low'),
  mkStudent('st2', 'Данияр Ахметов',     '+7 702 345 67 89', 'low'),
  mkStudent('st3', 'Лейла Нурланова',    '+7 707 456 78 90', 'medium'),
  mkStudent('st4', 'Тимур Жаксыбеков',   '+7 705 567 89 01', 'low'),
  mkStudent('st5', 'Зарина Смагулова',   '+7 700 678 90 12', 'critical'),
  mkStudent('st6', 'Асхат Бейсенов',     '+7 771 789 01 23', 'low'),
  mkStudent('st7', 'Назгуль Амирова',    '+7 775 890 12 34', 'medium'),
  mkStudent('st8', 'Ерлан Касымов',      '+7 776 901 23 45', 'low'),
  mkStudent('st9', 'Жанар Токова',       '+7 778 012 34 56', 'low'),
  mkStudent('st10', 'Нурсулу Байжанова', '+7 747 123 45 67', 'medium'),
]

// ── Lessons (current week) ────────────────────────────────────────────────────

const today = new Date()
const weekStart = startOfWeek(today, { weekStartsOn: 1 })
const d = (offset: number) => format(addDays(weekStart, offset), 'yyyy-MM-dd')

export const DEMO_LESSONS: Lesson[] = [
  // Monday
  {
    id: 'les1', groupId: 'g1', group: DEMO_GROUPS[0], teacherId: 'u3', teacher: DEMO_TEACHER_1,
    roomId: 'r1', room: DEMO_ROOMS[0], date: d(0), startTime: '09:00', endTime: '10:30',
    topic: 'Квадратные уравнения', status: 'completed',
    isRecurring: true, seriesId: 'series1', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'les2', groupId: 'g2', group: DEMO_GROUPS[1], teacherId: 'u3', teacher: DEMO_TEACHER_1,
    roomId: 'r2', room: DEMO_ROOMS[1], date: d(0), startTime: '11:00', endTime: '12:30',
    topic: 'Conditionals II & III', status: 'completed',
    isRecurring: true, seriesId: 'series2', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'les3', groupId: 'g3', group: DEMO_GROUPS[2], teacherId: 'u4', teacher: DEMO_TEACHER_2,
    roomId: 'r3', room: DEMO_ROOMS[2], date: d(0), startTime: '14:00', endTime: '15:30',
    topic: 'Циклы for и while', status: 'scheduled',
    isRecurring: true, seriesId: 'series3', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  // Tuesday
  {
    id: 'les4', groupId: 'g4', group: DEMO_GROUPS[3], teacherId: 'u4', teacher: DEMO_TEACHER_2,
    roomId: 'r2', room: DEMO_ROOMS[1], date: d(1), startTime: '09:00', endTime: '10:30',
    topic: 'Reading strategies', status: 'scheduled',
    isRecurring: true, seriesId: 'series4', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'les5', groupId: 'g1', group: DEMO_GROUPS[0], teacherId: 'u3', teacher: DEMO_TEACHER_1,
    roomId: 'r1', room: DEMO_ROOMS[0], date: d(1), startTime: '11:00', endTime: '12:30',
    topic: null, status: 'scheduled',
    isRecurring: true, seriesId: 'series1', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  // Wednesday
  {
    id: 'les6', groupId: 'g2', group: DEMO_GROUPS[1], teacherId: 'u3', teacher: DEMO_TEACHER_1,
    roomId: 'r2', room: DEMO_ROOMS[1], date: d(2), startTime: '10:00', endTime: '11:30',
    topic: null, status: 'scheduled',
    isRecurring: true, seriesId: 'series2', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'les7', groupId: 'g3', group: DEMO_GROUPS[2], teacherId: 'u4', teacher: DEMO_TEACHER_2,
    roomId: 'r3', room: DEMO_ROOMS[2], date: d(2), startTime: '14:00', endTime: '15:30',
    topic: null, status: 'scheduled',
    isRecurring: true, seriesId: 'series3', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  // Thursday
  {
    id: 'les8', groupId: 'g4', group: DEMO_GROUPS[3], teacherId: 'u4', teacher: DEMO_TEACHER_2,
    roomId: 'r4', room: DEMO_ROOMS[3], date: d(3), startTime: '09:00', endTime: '10:30',
    topic: null, status: 'scheduled',
    isRecurring: true, seriesId: 'series4', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  // Friday
  {
    id: 'les9', groupId: 'g1', group: DEMO_GROUPS[0], teacherId: 'u3', teacher: DEMO_TEACHER_1,
    roomId: 'r1', room: DEMO_ROOMS[0], date: d(4), startTime: '09:00', endTime: '10:30',
    topic: null, status: 'scheduled',
    isRecurring: true, seriesId: 'series1', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'les10', groupId: 'g3', group: DEMO_GROUPS[2], teacherId: 'u4', teacher: DEMO_TEACHER_2,
    roomId: 'r3', room: DEMO_ROOMS[2], date: d(4), startTime: '11:00', endTime: '12:30',
    topic: null, status: 'scheduled',
    isRecurring: true, seriesId: 'series3', cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
  // Saturday
  {
    id: 'les11', groupId: 'g2', group: DEMO_GROUPS[1], teacherId: 'u3', teacher: DEMO_TEACHER_1,
    roomId: 'r2', room: DEMO_ROOMS[1], date: d(5), startTime: '10:00', endTime: '11:30',
    topic: null, status: 'scheduled',
    isRecurring: false, seriesId: null, cancelReason: null, createdAt: '2026-03-01T00:00:00Z',
  },
]

// ── Attendance (for conducted lessons) ───────────────────────────────────────

export const DEMO_ATTENDANCE: Record<string, AttendanceRecord[]> = {
  les1: [
    { lessonId: 'les1', studentId: 'st1', student: DEMO_STUDENTS[0], status: 'on_time', note: null },
    { lessonId: 'les1', studentId: 'st2', student: DEMO_STUDENTS[1], status: 'late', note: 'Опоздал на 10 мин' },
    { lessonId: 'les1', studentId: 'st3', student: DEMO_STUDENTS[2], status: 'absent', note: 'Болен' },
    { lessonId: 'les1', studentId: 'st4', student: DEMO_STUDENTS[3], status: 'on_time', note: null },
    { lessonId: 'les1', studentId: 'st5', student: DEMO_STUDENTS[4], status: 'absent', note: null },
    { lessonId: 'les1', studentId: 'st6', student: DEMO_STUDENTS[5], status: 'on_time', note: null },
    { lessonId: 'les1', studentId: 'st7', student: DEMO_STUDENTS[6], status: 'on_time', note: null },
    { lessonId: 'les1', studentId: 'st8', student: DEMO_STUDENTS[7], status: 'late', note: null },
  ],
}

// ── Grades (for conducted lessons) ───────────────────────────────────────────

export const DEMO_GRADES: Record<string, GradeRecord[]> = {
  les1: [
    { lessonId: 'les1', studentId: 'st1', student: DEMO_STUDENTS[0], grade: 9, comment: null },
    { lessonId: 'les1', studentId: 'st2', student: DEMO_STUDENTS[1], grade: 7, comment: null },
    { lessonId: 'les1', studentId: 'st4', student: DEMO_STUDENTS[3], grade: 8, comment: null },
    { lessonId: 'les1', studentId: 'st6', student: DEMO_STUDENTS[5], grade: 4, comment: 'Не понимает тему, нужна доп. работа' },
    { lessonId: 'les1', studentId: 'st7', student: DEMO_STUDENTS[6], grade: 6, comment: null },
    { lessonId: 'les1', studentId: 'st8', student: DEMO_STUDENTS[7], grade: 8, comment: null },
  ],
}

// ── Diamonds ─────────────────────────────────────────────────────────────────

export const DEMO_DIAMONDS: Record<string, DiamondRecord[]> = {
  les1: [
    { lessonId: 'les1', studentId: 'st1', student: DEMO_STUDENTS[0], diamonds: 3 },
    { lessonId: 'les1', studentId: 'st4', student: DEMO_STUDENTS[3], diamonds: 2 },
  ],
}

// ── Homework ──────────────────────────────────────────────────────────────────

export const DEMO_HW_ASSIGNMENTS: HomeworkAssignment[] = [
  {
    id: 'hw1', lessonId: 'les1', lesson: DEMO_LESSONS[0], groupId: 'g1',
    title: 'Задачи на квадратные уравнения', description: 'Параграф 12, задачи 1–20',
    dueDate: d(4), createdAt: d(0) + 'T10:30:00Z',
  },
  {
    id: 'hw2', lessonId: 'les2', lesson: DEMO_LESSONS[1], groupId: 'g2',
    title: 'Write a conditional story', description: 'Min 150 words using II and III conditional',
    dueDate: d(3), createdAt: d(0) + 'T12:30:00Z',
  },
]

export const DEMO_HW_SUBMISSIONS: HomeworkSubmission[] = [
  {
    id: 'sub1', assignmentId: 'hw1', assignment: DEMO_HW_ASSIGNMENTS[0],
    studentId: 'st1', student: DEMO_STUDENTS[0],
    submittedAt: d(1) + 'T18:00:00Z', status: 'submitted',
    fileUrl: null, comment: 'Все задачи выполнены', grade: null, feedback: null, reviewedAt: null,
  },
  {
    id: 'sub2', assignmentId: 'hw1', assignment: DEMO_HW_ASSIGNMENTS[0],
    studentId: 'st2', student: DEMO_STUDENTS[1],
    submittedAt: d(2) + 'T09:00:00Z', status: 'reviewed',
    fileUrl: null, comment: null, grade: 8, feedback: 'Хорошая работа, ошибка в задаче 14', reviewedAt: d(2) + 'T20:00:00Z',
  },
  {
    id: 'sub3', assignmentId: 'hw2', assignment: DEMO_HW_ASSIGNMENTS[1],
    studentId: 'st1', student: DEMO_STUDENTS[0],
    submittedAt: null, status: 'overdue',
    fileUrl: null, comment: null, grade: null, feedback: null, reviewedAt: null,
  },
]

// ── Late Entry Requests ───────────────────────────────────────────────────────

export const DEMO_LATE_REQUESTS: LateEntryRequest[] = [
  {
    id: 'lr1', lessonId: 'les3', lesson: DEMO_LESSONS[2],
    teacherId: 'u4', teacher: DEMO_TEACHER_2,
    reason: 'Забыл отметить посещаемость — был праздник', status: 'pending',
    reviewedBy: null, reviewNote: null, reviewedAt: null,
    createdAt: d(1) + 'T09:00:00Z',
  },
  {
    id: 'lr2', lessonId: 'les2', lesson: DEMO_LESSONS[1],
    teacherId: 'u3', teacher: DEMO_TEACHER_1,
    reason: 'Технические проблемы с системой вечером', status: 'approved',
    reviewedBy: 'u2', reviewNote: 'Одобрено. Внесите данные до конца дня.',
    reviewedAt: d(0) + 'T23:00:00Z',
    createdAt: d(0) + 'T22:30:00Z',
  },
]

// ── MUP Tasks ─────────────────────────────────────────────────────────────────

const dueStr = (days: number) => format(addDays(new Date(), days), 'yyyy-MM-dd') + 'T18:00:00Z'

export const DEMO_MUP_TASKS: MupTask[] = [
  {
    id: 'mt1', title: 'Подготовить расписание на май', description: 'Учесть праздничные дни',
    status: 'scheduled', priority: 'high', dueDate: dueStr(3),
    assignedTo: 'u2', assignee: DEMO_MUP, createdAt: d(0) + 'T09:00:00Z',
  },
  {
    id: 'mt2', title: 'Зачислить новых студентов — группа Python Starter', description: '3 новых заявки',
    status: 'pending', priority: 'medium', dueDate: dueStr(2),
    assignedTo: 'u2', assignee: DEMO_MUP, createdAt: d(0) + 'T10:00:00Z',
  },
  {
    id: 'mt3', title: 'Проверить оценки за март', description: null,
    status: 'pending', priority: 'low', dueDate: dueStr(7),
    assignedTo: 'u1', assignee: DEMO_DIRECTOR, createdAt: d(1) + 'T09:00:00Z',
  },
  {
    id: 'mt4', title: 'Согласовать аренду дополнительного кабинета', description: null,
    status: 'done', priority: 'medium', dueDate: dueStr(-1),
    assignedTo: 'u2', assignee: DEMO_MUP, createdAt: d(-3) + 'T09:00:00Z',
  },
]

// ── Notifications ─────────────────────────────────────────────────────────────

export const DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n1', type: 'late_request_approved', isRead: false,
    title: 'Запрос одобрен',
    body: 'МУП одобрила ваш запрос на позднее внесение для урока «English Advanced»',
    linkedId: 'lr2', createdAt: d(0) + 'T23:00:00Z',
  },
  {
    id: 'n2', type: 'lesson_reminder', isRead: false,
    title: 'Урок через 30 минут',
    body: 'Алгебра 9А — начало в 09:00, Кабинет 101',
    linkedId: 'les5', createdAt: d(1) + 'T08:30:00Z',
  },
  {
    id: 'n3', type: 'risk_level_changed', isRead: true,
    title: 'Изменился уровень риска',
    body: 'Зарина Смагулова перешла в статус «Критично»',
    linkedId: 'st5', createdAt: d(-1) + 'T02:05:00Z',
  },
]

// ── Compensation ──────────────────────────────────────────────────────────────

export const DEMO_COMPENSATIONS: CompensationModel[] = [
  {
    id: 'cm1', teacherId: 'u3', teacher: DEMO_TEACHER_1,
    modelType: 'per_lesson', isHybrid: false,
    ratePerLesson: { sub1: 5000, sub3: 4500 },
    fixedMonthlyRate: null, ratePerStudent: null,
    effectiveFrom: '2026-01-01', createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'cm2', teacherId: 'u4', teacher: DEMO_TEACHER_2,
    modelType: 'per_lesson', isHybrid: false,
    ratePerLesson: { sub5: 6000, sub4: 5500 },
    fixedMonthlyRate: null, ratePerStudent: null,
    effectiveFrom: '2026-01-01', createdAt: '2026-01-01T00:00:00Z',
  },
]

// ── Analytics ────────────────────────────────────────────────────────────────

export const DEMO_ANALYTICS_OVERVIEW: LmsAnalyticsOverview = {
  totalStudents:      10,
  activeGroups:       4,
  lessonsThisWeek:    11,
  avgAttendance:      82,
  atRiskStudents:     3,
  criticalStudents:   1,
  homeworkSubmitRate: 68,
  incompleteLesson:   1,
  delta: {
    avgAttendance:      4.2,
    atRiskStudents:    -1,
    homeworkSubmitRate: 12.5,
  },
}

export const DEMO_ANALYTICS_ATTENDANCE: AttendanceStat[] = Array.from({ length: 14 }, (_, i) => ({
  date:           format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'),
  attendanceRate: 70 + Math.round(Math.random() * 25),
  lessonCount:    2 + Math.round(Math.random() * 2),
}))

export const DEMO_ANALYTICS_TEACHERS: TeacherPerformanceStat[] = [
  { teacherId: 'u3', teacherName: 'Асель Нурланова', avatarUrl: null, lessonsScheduled: 18, lessonsConducted: 17, lessonsIncomplete: 1, conductRate: 94.4 },
  { teacherId: 'u4', teacherName: 'Марат Ибрагимов', avatarUrl: null, lessonsScheduled: 14, lessonsConducted: 12, lessonsIncomplete: 2, conductRate: 85.7 },
]

export const DEMO_ANALYTICS_GRADES: GradeDistributionItem[] = [
  { subjectId: 'sub1', subjectName: 'Алгебра', avgGrade: 7.2, distribution: { '1': 0, '2': 1, '3': 2, '4': 3, '5': 5, '6': 8, '7': 12, '8': 10, '9': 6, '10': 3 } },
  { subjectId: 'sub3', subjectName: 'Разговорный английский', avgGrade: 8.1, distribution: { '1': 0, '2': 0, '3': 1, '4': 2, '5': 3, '6': 5, '7': 8, '8': 12, '9': 9, '10': 5 } },
  { subjectId: 'sub5', subjectName: 'Python', avgGrade: 7.8, distribution: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 4, '6': 6, '7': 9, '8': 8, '9': 4, '10': 2 } },
]

export const DEMO_RISK_FACTORS: Record<string, RiskFactors> = {
  st3: {
    studentId: 'st3', attendanceScore: 'medium', gradesScore: 'low',
    homeworkScore: 'medium', paymentScore: 'low', overallRisk: 'medium',
    calculatedAt: d(-1) + 'T02:00:00Z',
    details: { attendancePercent14d: 64, avgGradeLast5: 6.4, missedHomeworkStreak: 2, debtDays: 0 },
  },
  st5: {
    studentId: 'st5', attendanceScore: 'critical', gradesScore: 'medium',
    homeworkScore: 'critical', paymentScore: 'medium', overallRisk: 'critical',
    calculatedAt: d(-1) + 'T02:00:00Z',
    details: { attendancePercent14d: 43, avgGradeLast5: 3.8, missedHomeworkStreak: 5, debtDays: 14 },
  },
}

// ── Finance payments ──────────────────────────────────────────────────────────

export const DEMO_PAYMENTS = [
  { id: 'pay1', studentId: DEMO_STUDENTS[0].id, studentName: DEMO_STUDENTS[0].fullName, amount: 25000, month: '2026-03', status: 'paid' as const, paidAt: subDays(new Date(), 15).toISOString(), description: 'Оплата курса' },
  { id: 'pay2', studentId: DEMO_STUDENTS[1].id, studentName: DEMO_STUDENTS[1].fullName, amount: 30000, month: '2026-03', status: 'paid' as const, paidAt: subDays(new Date(), 12).toISOString(), description: 'Оплата курса' },
  { id: 'pay3', studentId: DEMO_STUDENTS[2].id, studentName: DEMO_STUDENTS[2].fullName, amount: 25000, month: '2026-04', status: 'pending' as const, paidAt: null, description: 'Оплата курса' },
  { id: 'pay4', studentId: DEMO_STUDENTS[3].id, studentName: DEMO_STUDENTS[3].fullName, amount: 30000, month: '2026-04', status: 'pending' as const, paidAt: null, description: 'Оплата курса' },
  { id: 'pay5', studentId: DEMO_STUDENTS[4].id, studentName: DEMO_STUDENTS[4].fullName, amount: 25000, month: '2026-03', status: 'overdue' as const, paidAt: null, description: 'Оплата курса' },
  { id: 'pay6', studentId: DEMO_STUDENTS[5].id, studentName: DEMO_STUDENTS[5].fullName, amount: 30000, month: '2026-03', status: 'overdue' as const, paidAt: null, description: 'Оплата курса' },
  { id: 'pay7', studentId: DEMO_STUDENTS[0].id, studentName: DEMO_STUDENTS[0].fullName, amount: 25000, month: '2026-04', status: 'paid' as const, paidAt: subDays(new Date(), 3).toISOString(), description: 'Оплата курса' },
  { id: 'pay8', studentId: DEMO_STUDENTS[6].id, studentName: DEMO_STUDENTS[6].fullName, amount: 20000, month: '2026-04', status: 'pending' as const, paidAt: null, description: 'Оплата за материалы' },
]

// ── Exams ─────────────────────────────────────────────────────────────────────

export const DEMO_EXAMS: Exam[] = [
  {
    id: 'ex1', title: 'Промежуточный экзамен — Алгебра',
    groupId: 'g1', group: DEMO_GROUPS[0],
    date: d(7), startTime: '10:00', endTime: '12:00',
    roomId: 'r1', room: DEMO_ROOMS[0],
    description: 'Темы: квадратные уравнения, неравенства, функции',
    status: 'upcoming', createdAt: new Date().toISOString(),
  },
  {
    id: 'ex2', title: 'Финальный тест — English Advanced',
    groupId: 'g2', group: DEMO_GROUPS[1],
    date: d(10), startTime: '09:00', endTime: '10:30',
    roomId: 'r2', room: DEMO_ROOMS[1],
    description: 'Listening, Reading, Writing sections',
    status: 'upcoming', createdAt: new Date().toISOString(),
  },
  {
    id: 'ex3', title: 'Контрольная работа — Python',
    groupId: 'g3', group: DEMO_GROUPS[2],
    date: d(-7), startTime: '14:00', endTime: '15:30',
    roomId: 'r3', room: DEMO_ROOMS[2],
    description: null,
    status: 'completed', createdAt: new Date().toISOString(),
  },
]
