import type {
  Student, Subject, Assignment, Grade, AttendanceRecord,
  Lesson, Material, Achievement, ActivityEvent,
  LeaderboardEntry, Payment, Contact, DashboardData,
} from '@/types/student'

// ── Current student ───────────────────────────────────────────────────────────
export const DEMO_STUDENT: Student = {
  id: 'stu-001',
  fullName: 'Shahzod Sobitaliуev',
  photo: null,
  studentCode: 'SEP-24211',
  groupId: 'grp-1',
  groupName: 'SEP-242(1)',
  stars: 1140,
  crystals: 543,
  email: 'shahzodsobitaliуev@gmail.com',
  phone: '+998974879395',
  dateOfBirth: '1993-11-11',
}

export const DEMO_TOKEN = 'demo-student-token'

// ── Subjects ──────────────────────────────────────────────────────────────────
export const DEMO_SUBJECTS: Subject[] = [
  { id: 'sub-1', name: 'Технология доступа к базам данных ADO.NET', teacherName: 'Алиев Нурбек', currentAvgGrade: 11.7 },
  { id: 'sub-2', name: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', currentAvgGrade: 10.5 },
  { id: 'sub-3', name: 'Node.JS + TypeScript', teacherName: 'Рахимов Дилшод', currentAvgGrade: 9.8 },
]

// ── Grades (last 3 months) ────────────────────────────────────────────────────
const today = new Date()
const d = (offset: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() - offset)
  return date.toISOString().split('T')[0]
}

export const DEMO_GRADES: Grade[] = [
  // ADO.NET grades
  { id: 'g1',  date: d(2),  subjectId: 'sub-1', type: 'class',       value: 12 },
  { id: 'g2',  date: d(4),  subjectId: 'sub-1', type: 'independent', value: 11 },
  { id: 'g3',  date: d(7),  subjectId: 'sub-1', type: 'class',       value: 12 },
  { id: 'g4',  date: d(11), subjectId: 'sub-1', type: 'control',     value: 10 },
  { id: 'g5',  date: d(14), subjectId: 'sub-1', type: 'independent', value: 12 },
  { id: 'g6',  date: d(18), subjectId: 'sub-1', type: 'class',       value: 11 },
  { id: 'g7',  date: d(21), subjectId: 'sub-1', type: 'thematic',    value: 12 },
  { id: 'g8',  date: d(25), subjectId: 'sub-1', type: 'class',       value: 12 },
  { id: 'g9',  date: d(30), subjectId: 'sub-1', type: 'independent', value: 10 },
  { id: 'g10', date: d(35), subjectId: 'sub-1', type: 'class',       value: 11 },
  { id: 'g11', date: d(42), subjectId: 'sub-1', type: 'control',     value: 12 },
  { id: 'g12', date: d(50), subjectId: 'sub-1', type: 'class',       value: 10 },
  // Python
  { id: 'g13', date: d(3),  subjectId: 'sub-2', type: 'class',       value: 10 },
  { id: 'g14', date: d(6),  subjectId: 'sub-2', type: 'independent', value: 11 },
  { id: 'g15', date: d(10), subjectId: 'sub-2', type: 'class',       value: 10 },
  { id: 'g16', date: d(15), subjectId: 'sub-2', type: 'control',     value: 9  },
  { id: 'g17', date: d(20), subjectId: 'sub-2', type: 'class',       value: 10 },
  { id: 'g18', date: d(28), subjectId: 'sub-2', type: 'independent', value: 12 },
  // Node.JS
  { id: 'g19', date: d(5),  subjectId: 'sub-3', type: 'class',       value: 9  },
  { id: 'g20', date: d(9),  subjectId: 'sub-3', type: 'independent', value: 10 },
  { id: 'g21', date: d(16), subjectId: 'sub-3', type: 'class',       value: 10 },
  { id: 'g22', date: d(22), subjectId: 'sub-3', type: 'control',     value: 10 },
]

// ── Attendance ────────────────────────────────────────────────────────────────
export const DEMO_ATTENDANCE: AttendanceRecord[] = [
  ...Array.from({ length: 30 }, (_, i) => ({
    date: d(i),
    subjectId: i % 3 === 0 ? 'sub-1' : i % 3 === 1 ? 'sub-2' : 'sub-3',
    status: (i === 5 || i === 17 ? 'absent' : i === 12 ? 'late' : 'present') as 'present' | 'absent' | 'late',
  })),
]

// ── Assignments ───────────────────────────────────────────────────────────────
const futureD = (offset: number) => {
  const date = new Date(today)
  date.setDate(date.getDate() + offset)
  return date.toISOString().split('T')[0]
}

export const DEMO_ASSIGNMENTS: Assignment[] = [
  // Pending
  { id: 'a1',  title: 'Python (set) — 2 часть', type: 'independent', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', description: 'Повторите код урока и выполните Д3. Реализуйте функции из методички.', lessonDate: d(8), deadline: futureD(6), status: 'pending', grade: null, teacherComment: null, submittedFileUrl: null, materialsCount: 2 },
  { id: 'a2',  title: 'Python (set)', type: 'independent', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', description: 'Выполните задания по множествам из учебника, стр. 45–52.', lessonDate: d(9), deadline: futureD(4), status: 'pending', grade: null, teacherComment: null, submittedFileUrl: null, materialsCount: 1 },
  { id: 'a3',  title: 'CRUD 4 часть NodeJS + TS', type: 'independent', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', teacherName: 'Рахимов Дилшод', description: 'Реализуйте CRUD операции с использованием TypeScript и Express.', lessonDate: d(19), deadline: futureD(2), status: 'pending', grade: null, teacherComment: null, submittedFileUrl: null, materialsCount: 3 },
  { id: 'a4',  title: 'Технология доступа к базам данных ADO.NET', type: 'homework', subjectId: 'sub-1', subjectName: 'Технология доступа к базам данных ADO.NET', teacherName: 'Алиев Нурбек', description: 'Повторите код урока и выполните задание Д3. Используйте SqlDataAdapter.', lessonDate: d(2), deadline: futureD(1), status: 'overdue', grade: null, teacherComment: null, submittedFileUrl: null, materialsCount: 0 },
  { id: 'a5',  title: 'Python (массивы, кортежи и…)', type: 'class', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', description: 'Работа с массивами и кортежами. Задания из методички.', lessonDate: d(8), deadline: futureD(8), status: 'pending', grade: null, teacherComment: null, submittedFileUrl: null, materialsCount: 1 },
  { id: 'a6',  title: 'NodeJS + TS 1 часть', type: 'independent', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', teacherName: 'Рахимов Дилшод', description: 'Настройка TypeScript в проекте Node.js. Реализуйте базовый сервер.', lessonDate: d(12), deadline: futureD(10), status: 'pending', grade: null, teacherComment: null, submittedFileUrl: null, materialsCount: 2 },
  // Submitted / In review
  { id: 'a7',  title: 'ExpressJS GET и FS 3 часть', type: 'independent', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', teacherName: 'Рахимов Дилшод', description: 'Работа с файловой системой Node.js.', lessonDate: d(32), deadline: d(22), status: 'submitted', grade: null, teacherComment: null, submittedFileUrl: 'homework_express_fs.zip', materialsCount: 1 },
  { id: 'a8',  title: 'CRUD 3 часть NodeJS + TS', type: 'independent', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', teacherName: 'Рахимов Дилшод', description: 'Расширенные операции CRUD.', lessonDate: d(31), deadline: d(21), status: 'submitted', grade: null, teacherComment: null, submittedFileUrl: 'crud3.zip', materialsCount: 0 },
  // Reviewed / Completed
  { id: 'a9',  title: 'Основа Python (перемен…)', type: 'independent', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', description: 'Работа с переменными и типами данных.', lessonDate: d(40), deadline: d(30), status: 'reviewed', grade: 12, teacherComment: 'хорошо выполнено 😊', submittedFileUrl: 'python_vars.zip', materialsCount: 0 },
  { id: 'a10', title: 'массивы и методы (пра…)', type: 'class', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', description: 'Практическая работа по массивам.', lessonDate: d(38), deadline: d(28), status: 'reviewed', grade: 11, teacherComment: 'Хорошая работа, но есть небольшие ошибки в задании 3.', submittedFileUrl: 'arrays.zip', materialsCount: 0 },
  { id: 'a11', title: 'Финал портфолио и ада…', type: 'thematic', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', teacherName: 'Мирзаев Санжар', description: 'Финальная работа по курсу.', lessonDate: d(45), deadline: d(35), status: 'reviewed', grade: 12, teacherComment: 'Отличная работа!', submittedFileUrl: 'portfolio.zip', materialsCount: 0 },
  { id: 'a12', title: 'Технология доступа к базам данных ADO.NET', type: 'homework', subjectId: 'sub-1', subjectName: 'Технология доступа к базам данных ADO.NET', teacherName: 'Алиев Нурбек', description: 'Повторение материала.', lessonDate: d(20), deadline: d(14), status: 'reviewed', grade: 12, teacherComment: null, submittedFileUrl: 'adonet_hw.zip', materialsCount: 0 },
]

// ── Schedule (current week + next week) ───────────────────────────────────────
const getWeekDate = (weekOffset: number, dayOffset: number): string => {
  const date = new Date(today)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + mondayOffset + weekOffset * 7 + dayOffset)
  return date.toISOString().split('T')[0]
}

export const DEMO_LESSONS: Lesson[] = [
  // Current week: Mon, Wed, Fri, Mon+1, Wed+1, Fri+1
  { id: 'l1', subjectName: 'Технология доступа к базам данных ADO.NET', subjectId: 'sub-1', teacherName: 'Алиев Нурбек', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(0, 0), groupNumber: '701', room: null, isOnline: true },
  { id: 'l2', subjectName: 'Технология доступа к базам данных ADO.NET', subjectId: 'sub-1', teacherName: 'Алиев Нурбек', startTime: '20:30', endTime: '21:30', weekDate: getWeekDate(0, 0), groupNumber: '701', room: null, isOnline: true },
  { id: 'l3', subjectName: 'Python (базовый курс)', subjectId: 'sub-2', teacherName: 'Мирзаев Санжар', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(0, 2), groupNumber: '701', room: null, isOnline: true },
  { id: 'l4', subjectName: 'Node.JS + TypeScript', subjectId: 'sub-3', teacherName: 'Рахимов Дилшод', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(0, 3), groupNumber: '701', room: null, isOnline: true },
  { id: 'l5', subjectName: 'Технология доступа к базам данных ADO.NET', subjectId: 'sub-1', teacherName: 'Алиев Нурбек', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(0, 4), groupNumber: '701', room: null, isOnline: true },
  { id: 'l6', subjectName: 'Python (базовый курс)', subjectId: 'sub-2', teacherName: 'Мирзаев Санжар', startTime: '20:30', endTime: '21:30', weekDate: getWeekDate(0, 4), groupNumber: '701', room: null, isOnline: true },
  // Next week
  { id: 'l7',  subjectName: 'Технология доступа к базам данных ADO.NET', subjectId: 'sub-1', teacherName: 'Алиев Нурбек', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(1, 0), groupNumber: '701', room: null, isOnline: true },
  { id: 'l8',  subjectName: 'Python (базовый курс)', subjectId: 'sub-2', teacherName: 'Мирзаев Санжар', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(1, 2), groupNumber: '701', room: null, isOnline: true },
  { id: 'l9',  subjectName: 'Node.JS + TypeScript', subjectId: 'sub-3', teacherName: 'Рахимов Дилшод', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(1, 3), groupNumber: '701', room: null, isOnline: true },
  { id: 'l10', subjectName: 'Технология доступа к базам данных ADO.NET', subjectId: 'sub-1', teacherName: 'Алиев Нурбек', startTime: '19:00', endTime: '20:30', weekDate: getWeekDate(1, 4), groupNumber: '701', room: null, isOnline: true },
]

// ── Materials ─────────────────────────────────────────────────────────────────
export const DEMO_MATERIALS: Material[] = [
  { id: 'm1', title: 'Введение в ADO.NET — SqlConnection и SqlCommand', subjectId: 'sub-1', subjectName: 'Технология доступа к базам данных ADO.NET', type: 'pdf', language: 'ru', url: '#', uploadedAt: d(14) },
  { id: 'm2', title: 'SqlDataAdapter — методичка', subjectId: 'sub-1', subjectName: 'Технология доступа к базам данных ADO.NET', type: 'pdf', language: 'ru', url: '#', uploadedAt: d(10) },
  { id: 'm3', title: 'Python: Множества и словари', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', type: 'video', language: 'ru', url: '#', uploadedAt: d(7) },
  { id: 'm4', title: 'Python Lists & Tuples Guide', subjectId: 'sub-2', subjectName: 'Python (базовый курс)', type: 'article', language: 'en', url: '#', uploadedAt: d(12) },
  { id: 'm5', title: 'TypeScript Handbook', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', type: 'pdf', language: 'en', url: '#', uploadedAt: d(5) },
  { id: 'm6', title: 'Express.js — практическое руководство', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', type: 'presentation', language: 'ru', url: '#', uploadedAt: d(8) },
  { id: 'm7', title: 'Node.js File System (fs модуль)', subjectId: 'sub-3', subjectName: 'Node.JS + TypeScript', type: 'article', language: 'ru', url: '#', uploadedAt: d(3) },
  { id: 'm8', title: 'ADO.NET Tutorial for Beginners', subjectId: 'sub-1', subjectName: 'Технология доступа к базам данных ADO.NET', type: 'video', language: 'en', url: '#', uploadedAt: d(20) },
]

// ── Achievements ──────────────────────────────────────────────────────────────
export const DEMO_ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1',  name: 'Супербойд',                description: 'Оставьте свои отзывы в ITSTEP',                         category: 'activity',   icon: '🏆', rewardStars: 20, rewardCrystals: 1, isUnlocked: true,  unlockedAt: d(5) },
  { id: 'ach-2',  name: 'Бейдж месяца',             description: 'Получите 5 оценок больше 8 баллов в этом месяце',       category: 'academic',   icon: '🤘', rewardStars: 10, rewardCrystals: 1, isUnlocked: true,  unlockedAt: d(3) },
  { id: 'ach-3',  name: 'Подтверждение email',      description: 'Подтвердите адрес электронной почты',                   category: 'activity',   icon: '📧', rewardStars: 3,  rewardCrystals: 1, isUnlocked: true,  unlockedAt: d(60) },
  { id: 'ach-4',  name: 'Участие в конкурсе',       description: 'Примите участие в конкурсе',                            category: 'social',     icon: '🏅', rewardStars: 1,  rewardCrystals: 1, isUnlocked: false, unlockedAt: null },
  { id: 'ach-5',  name: '5 посещений подряд',       description: 'Посетите 5 занятий подряд без пропусков',               category: 'attendance', icon: '📅', rewardStars: 1,  rewardCrystals: 1, isUnlocked: true,  unlockedAt: d(15) },
  { id: 'ach-6',  name: '10 посещений подряд',      description: 'Посетите 10 занятий подряд без пропусков',              category: 'attendance', icon: '🗓', rewardStars: 2,  rewardCrystals: 1, isUnlocked: true,  unlockedAt: d(10) },
  { id: 'ach-7',  name: '20 посещений подряд',      description: 'Посетите 20 занятий подряд без пропусков',              category: 'attendance', icon: '🎯', rewardStars: 5,  rewardCrystals: 1, isUnlocked: false, unlockedAt: null },
  { id: 'ach-8',  name: 'Всегда вовремя',           description: 'Посетите 5 занятий подряд без опозданий',               category: 'attendance', icon: '⚡', rewardStars: 1,  rewardCrystals: 1, isUnlocked: false, unlockedAt: null },
  { id: 'ach-9',  name: 'Первое задание',           description: 'Сдайте своё первое задание',                            category: 'academic',   icon: '📝', rewardStars: 2,  rewardCrystals: 1, isUnlocked: true,  unlockedAt: d(90) },
  { id: 'ach-10', name: 'Отличник',                 description: 'Получите оценку 12 за контрольную работу',              category: 'academic',   icon: '⭐', rewardStars: 5,  rewardCrystals: 2, isUnlocked: true,  unlockedAt: d(20) },
  { id: 'ach-11', name: 'Серия из 5 сдач',          description: 'Сдайте 5 заданий подряд вовремя',                       category: 'academic',   icon: '🔥', rewardStars: 3,  rewardCrystals: 1, isUnlocked: false, unlockedAt: null },
  { id: 'ach-12', name: 'Особое достижение',        description: 'Получите специальную награду от администрации',         category: 'special',    icon: '💎', rewardStars: 10, rewardCrystals: 5, isUnlocked: false, unlockedAt: null },
]

// ── Activity Feed ─────────────────────────────────────────────────────────────
export const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: 'ev1',  date: d(0),  type: 'homework_graded',  description: 'Технология доступа к базам данных ADO.NET — Самостоятельная работа', starsAmount: 3,  crystalsAmount: null, subjectName: 'ADO.NET' },
  { id: 'ev2',  date: d(0),  type: 'attendance',       description: 'Технология доступа к базам данных ADO.NET — Посещение занятия',       starsAmount: 1,  crystalsAmount: null, subjectName: 'ADO.NET' },
  { id: 'ev3',  date: d(1),  type: 'homework_graded',  description: 'Технология доступа к базам данных ADO.NET — Работа в классе',         starsAmount: 2,  crystalsAmount: null, subjectName: 'ADO.NET' },
  { id: 'ev4',  date: d(1),  type: 'stars_earned',     description: 'Технология доступа к базам данных ADO.NET — Самостоятельная работа', starsAmount: 1,  crystalsAmount: null, subjectName: 'ADO.NET' },
  { id: 'ev5',  date: d(2),  type: 'teacher_reply',    description: 'Технология доступа к базам данных ADO.NET — Ответ преподавателя',     starsAmount: null, crystalsAmount: null, subjectName: 'ADO.NET' },
  { id: 'ev6',  date: d(2),  type: 'attendance',       description: 'Python (базовый курс) — Посещение занятия',                          starsAmount: 1,  crystalsAmount: null, subjectName: 'Python' },
  { id: 'ev7',  date: d(3),  type: 'homework_graded',  description: 'Python (базовый курс) — Самостоятельная работа',                     starsAmount: 3,  crystalsAmount: 1,    subjectName: 'Python' },
  { id: 'ev8',  date: d(3),  type: 'badge_unlocked',   description: 'Получена награда: Бейдж месяца',                                     starsAmount: 10, crystalsAmount: 1,    subjectName: null },
  { id: 'ev9',  date: d(4),  type: 'attendance',       description: 'Node.JS + TypeScript — Посещение занятия',                           starsAmount: 1,  crystalsAmount: null, subjectName: 'Node.JS' },
  { id: 'ev10', date: d(4),  type: 'homework_graded',  description: 'Node.JS + TypeScript — Работа в классе',                             starsAmount: 2,  crystalsAmount: null, subjectName: 'Node.JS' },
  { id: 'ev11', date: d(5),  type: 'attendance',       description: 'Технология доступа к базам данных ADO.NET — Посещение занятия',       starsAmount: 1,  crystalsAmount: null, subjectName: 'ADO.NET' },
  { id: 'ev12', date: d(6),  type: 'stars_earned',     description: 'Python (базовый курс) — Самостоятельная работа',                     starsAmount: 2,  crystalsAmount: null, subjectName: 'Python' },
]

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, studentId: 'stu-010', fullName: 'Timofeyev Bogdan Khananovich', photo: null, points: 1985, isCurrentUser: false },
  { rank: 2, studentId: 'stu-011', fullName: 'Sobitaliуev Shahzod Saidjon', photo: null, points: 1683, isCurrentUser: false },
  { rank: 3, studentId: 'stu-012', fullName: 'Timofeyev Roman Georgiyevich', photo: null, points: 1568, isCurrentUser: false },
  { rank: 4, studentId: 'stu-013', fullName: 'Shakarimov Shodiyur Shomasku...', photo: null, points: 1350, isCurrentUser: false },
  { rank: 5, studentId: 'stu-001', fullName: 'Shahzod Sobitaliуev', photo: null, points: 1218, isCurrentUser: true },
  { rank: 6, studentId: 'stu-014', fullName: 'Ibrаgimova Gunhora Bakhadir...', photo: null, points: 1152, isCurrentUser: false },
  { rank: 7, studentId: 'stu-015', fullName: 'Akbarov Axrorjon Abror', photo: null, points: 1098, isCurrentUser: false },
]

// ── Payments ──────────────────────────────────────────────────────────────────
export const DEMO_PAYMENTS: Payment[] = [
  // Upcoming
  { id: 'pay-1', period: 'Июнь 2026',     description: 'Оплата за обучение', amount: 1500000, currency: 'сум', status: 'pending', dueDate: '2026-06-01', paidAt: null },
  { id: 'pay-2', period: 'Июль 2026',     description: 'Оплата за обучение', amount: 1500000, currency: 'сум', status: 'pending', dueDate: '2026-07-01', paidAt: null },
  { id: 'pay-3', period: 'Август 2026',   description: 'Оплата за обучение', amount: 1500000, currency: 'сум', status: 'pending', dueDate: '2026-08-01', paidAt: null },
  // History
  { id: 'pay-4', period: 'Апрель 2026',   description: 'Оплата за обучение', amount: 1530000, currency: 'сум', status: 'paid', dueDate: '2026-04-01', paidAt: '2026-03-28' },
  { id: 'pay-5', period: 'Март 2026',     description: 'Оплата за обучение', amount: 1500000, currency: 'сум', status: 'paid', dueDate: '2026-03-01', paidAt: '2026-02-27' },
  { id: 'pay-6', period: 'Февраль 2026',  description: 'Оплата за обучение', amount: 1500000, currency: 'сум', status: 'paid', dueDate: '2026-02-01', paidAt: '2026-01-30' },
  { id: 'pay-7', period: 'Январь 2026',   description: 'Оплата за обучение', amount: 500000,  currency: 'сум', status: 'paid', dueDate: '2026-01-01', paidAt: '2025-12-29' },
  { id: 'pay-8', period: 'Ноябрь 2025',   description: 'Оплата за обучение', amount: 4200000, currency: 'сум', status: 'paid', dueDate: '2025-11-01', paidAt: '2025-10-31' },
]

// ── Contacts ──────────────────────────────────────────────────────────────────
export const DEMO_CONTACTS: Contact[] = [
  { id: 'con-1', fullName: 'Алиев Нурбек Ахмадович',     role: 'teacher', subject: 'Технология доступа к базам данных ADO.NET', photo: null, email: 'aliev@edu.uz',   phone: '+998 90 123-45-67', telegram: '@aliev_nurb' },
  { id: 'con-2', fullName: 'Мирзаев Санжар Комилович',   role: 'teacher', subject: 'C# и .NET Framework',                        photo: null, email: 'mirzaev@edu.uz', phone: '+998 90 123-45-68', telegram: null },
  { id: 'con-3', fullName: 'Рахимов Дилшод Маратович',   role: 'teacher', subject: 'Основы программирования',                    photo: null, email: 'rahimov@edu.uz', phone: '+998 90 123-45-69', telegram: '@dilshod_r' },
  { id: 'con-4', fullName: 'Камилова Нилуфар Шавкатовна',role: 'curator', subject: null,                                          photo: null, email: 'kamilova@edu.uz',phone: '+998 90 123-45-70', telegram: '@nilufar_k' },
  { id: 'con-5', fullName: 'Техническая поддержка',      role: 'support', subject: null,                                          photo: null, email: 'support@edu.uz', phone: '+998 71 234-56-78', telegram: '@edu_support' },
]

// ── Dashboard aggregate ───────────────────────────────────────────────────────
export function buildDashboard(): DashboardData {
  const pending   = DEMO_ASSIGNMENTS.filter((a) => a.status === 'pending' || a.status === 'overdue').length
  const reviewed  = DEMO_ASSIGNMENTS.filter((a) => a.status === 'reviewed').length
  const total     = DEMO_ASSIGNMENTS.length

  const last30att = DEMO_ATTENDANCE.slice(0, 30)
  const present   = last30att.filter((a) => a.status === 'present').length
  const absent    = last30att.filter((a) => a.status === 'absent').length
  const late      = last30att.filter((a) => a.status === 'late').length
  const attTotal  = last30att.length || 1

  const gradesByMonth = [
    { month: 'Янв', class: 10.2, independent: 9.8, control: 10.5 },
    { month: 'Фев', class: 10.5, independent: 10.1, control: 10.0 },
    { month: 'Мар', class: 11.0, independent: 10.4, control: 10.8 },
    { month: 'Апр', class: 11.5, independent: 10.8, control: 11.0 },
    { month: 'Май', class: 10.8, independent: 11.2, control: 10.6 },
  ]

  return {
    pendingAssignments:  pending,
    onTimeAssignments:   reviewed,
    totalAssignments:    total,
    avgGrades: { class: 10.5, independent: 8.6, control: 10.4, thematic: 11.2 },
    attendance30d: {
      presentPercent: Math.round((present / attTotal) * 100),
      absentPercent:  Math.round((absent  / attTotal) * 100),
      latePercent:    Math.round((late    / attTotal) * 100),
    },
    recentGrades: DEMO_GRADES.slice(0, 30),
    activityFeed: DEMO_ACTIVITY,
    leaderboard:  DEMO_LEADERBOARD,
    attendanceCalendar: DEMO_ATTENDANCE,
    gradesByMonth,
  }
}
