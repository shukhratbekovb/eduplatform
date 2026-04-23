// Custom axios adapter for LMS demo mode.
// Intercepts all requests and returns mock data — zero network calls.

import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { parseISO, addDays, getISODay } from 'date-fns'
import {
  DEMO_DIRECTOR, DEMO_MUP, DEMO_TEACHER_1, DEMO_TEACHER_2, DEMO_TOKEN, DEMO_USERS,
  DEMO_DIRECTIONS, DEMO_SUBJECTS, DEMO_ROOMS, DEMO_GROUPS, DEMO_STUDENTS,
  DEMO_LESSONS, DEMO_ATTENDANCE, DEMO_GRADES, DEMO_DIAMONDS,
  DEMO_HW_ASSIGNMENTS, DEMO_HW_SUBMISSIONS,
  DEMO_LATE_REQUESTS, DEMO_MUP_TASKS, DEMO_NOTIFICATIONS,
  DEMO_COMPENSATIONS, DEMO_ANALYTICS_OVERVIEW, DEMO_ANALYTICS_ATTENDANCE,
  DEMO_ANALYTICS_TEACHERS, DEMO_ANALYTICS_GRADES, DEMO_RISK_FACTORS,
  DEMO_EXAMS, DEMO_PAYMENTS,
} from './data'
import type { Lesson, MupTask, LateEntryRequest, HomeworkSubmission, Direction, Subject, Room, Student, CompensationModel, Exam } from '@/types/lms'

// ── In-memory mutable state ───────────────────────────────────────────────────
let exams        = [...DEMO_EXAMS]
let payments     = [...DEMO_PAYMENTS]
let lessons      = [...DEMO_LESSONS]
let students     = [...DEMO_STUDENTS]
let groups       = [...DEMO_GROUPS]
let mupTasks     = [...DEMO_MUP_TASKS]
let lateRequests = [...DEMO_LATE_REQUESTS]
let notifications = [...DEMO_NOTIFICATIONS]
let hwSubmissions = [...DEMO_HW_SUBMISSIONS]
let directions   = [...DEMO_DIRECTIONS]
let subjects     = [...DEMO_SUBJECTS]
let rooms        = [...DEMO_ROOMS]
let compensations = [...DEMO_COMPENSATIONS]

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

function created(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 201, statusText: 'Created', headers: {}, config }
}

function noContent(config: InternalAxiosRequestConfig): AxiosResponse {
  return { data: {}, status: 204, statusText: 'No Content', headers: {}, config }
}

function resolve(res: AxiosResponse): Promise<AxiosResponse> {
  return new Promise((r) => setTimeout(() => r(res), 100))
}

function parseBody(data: unknown): Record<string, any> {
  if (!data) return {}
  if (typeof data === 'string') { try { return JSON.parse(data) } catch { return {} } }
  if (typeof data === 'object') return data as Record<string, any>
  return {}
}

function idFrom(url: string, resource: string): string {
  const m = url.match(new RegExp(`\\/${resource}\\/([^/?]+)`))
  return m?.[1] ?? ''
}

let _n = 200
function uid() { return `demo-${++_n}` }

function paginate<T>(arr: T[], page = 1, limit = 20) {
  const total = arr.length
  const start = (page - 1) * limit
  return {
    data: arr.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

// ── Main adapter ──────────────────────────────────────────────────────────────

export function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const url    = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  const body   = parseBody(config.data)

  // ── Auth ───────────────────────────────────────────────────────────────────
  if (url.includes('/auth/login')) {
    const email = body.email ?? ''
    const user =
      email.includes('mup')     ? DEMO_MUP :
      email.includes('teacher') ? DEMO_TEACHER_1 :
      DEMO_DIRECTOR
    return resolve(ok({ user, accessToken: DEMO_TOKEN }, config))
  }
  if (url.includes('/auth/me'))     return resolve(ok(DEMO_DIRECTOR, config))
  if (url.includes('/auth/logout')) return resolve(ok({}, config))

  // ── Notifications ──────────────────────────────────────────────────────────
  if (url.includes('/notifications/read-all'))
    return resolve(ok({}, config))
  if (url.includes('/notifications') && url.includes('/read'))
    return resolve(ok({}, config))
  if (url.includes('/notifications')) {
    if (method === 'post') {
      const id = idFrom(url, 'notifications')
      notifications = notifications.map((n) => n.id === id ? { ...n, isRead: true } : n)
      return resolve(ok({}, config))
    }
    return resolve(ok(notifications, config))
  }

  // ── LMS Users ──────────────────────────────────────────────────────────────
  if (url.includes('/lms/users') || url.includes('/lms/teachers')) {
    const params = config.params ?? {}
    if (method === 'post') {
      // Director can create users - add to mutable list
      return resolve(created({ id: uid(), avatarUrl: null, ...body }, config))
    }
    const filtered = params.role ? DEMO_USERS.filter((u) => u.role === params.role) : DEMO_USERS
    return resolve(ok(filtered, config))
  }

  // ── Directions ─────────────────────────────────────────────────────────────
  if (url.includes('/lms/directions')) {
    const dirId = idFrom(url, 'directions')
    if (url.includes('/archive')) {
      directions = directions.map((d) => d.id === dirId ? { ...d, isArchived: true } : d)
      return resolve(ok({}, config))
    }
    if (method === 'get' && !dirId) return resolve(ok(directions.filter((d) => !d.isArchived), config))
    if (method === 'get')   return resolve(ok(directions.find((d) => d.id === dirId) ?? directions[0], config))
    if (method === 'post') {
      const dir = { id: uid(), isArchived: false, subjectCount: 0, groupCount: 0, createdAt: new Date().toISOString(), ...body } as Direction
      directions.push(dir)
      return resolve(created(dir, config))
    }
    if (method === 'patch') {
      directions = directions.map((d) => d.id === dirId ? { ...d, ...body } : d)
      return resolve(ok(directions.find((d) => d.id === dirId), config))
    }
  }

  // ── Subjects ───────────────────────────────────────────────────────────────
  if (url.includes('/lms/subjects')) {
    const subId = idFrom(url, 'subjects')
    const params = config.params ?? {}
    if (method === 'get') {
      const filtered = params.directionId
        ? subjects.filter((s) => s.directionId === params.directionId && !s.isArchived)
        : subjects.filter((s) => !s.isArchived)
      return resolve(ok(filtered, config))
    }
    if (url.includes('/archive')) {
      subjects = subjects.map((s) => s.id === subId ? { ...s, isArchived: true } : s)
      return resolve(ok({}, config))
    }
    if (method === 'post') {
      const dir = directions.find((d) => d.id === body.directionId) ?? directions[0]
      const sub = { id: uid(), isArchived: false, description: null, direction: dir, ...body } as Subject
      subjects.push(sub)
      return resolve(created(sub, config))
    }
    if (method === 'patch') {
      subjects = subjects.map((s) => s.id === subId ? { ...s, ...body } : s)
      return resolve(ok(subjects.find((s) => s.id === subId), config))
    }
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────
  if (url.includes('/lms/rooms')) {
    const roomId = idFrom(url, 'rooms')
    if (method === 'get')  return resolve(ok(rooms, config))
    if (method === 'post') {
      const room = { id: uid(), isActive: true, capacity: null, ...body } as Room
      rooms.push(room)
      return resolve(created(room, config))
    }
    if (method === 'patch') {
      rooms = rooms.map((r) => r.id === roomId ? { ...r, ...body } : r)
      return resolve(ok(rooms.find((r) => r.id === roomId), config))
    }
    if (method === 'delete') {
      rooms = rooms.filter((r) => r.id !== roomId)
      return resolve(noContent(config))
    }
  }

  // ── Groups ─────────────────────────────────────────────────────────────────
  if (url.includes('/lms/groups')) {
    const groupId = idFrom(url, 'groups')
    if (url.includes('/students')) return resolve(ok(DEMO_STUDENTS.slice(0, 8), config))
    if (url.includes('/lessons'))  return resolve(ok(lessons.filter((l) => l.groupId === groupId), config))
    if (url.includes('/archive'))  {
      groups = groups.map((g) => g.id === groupId ? { ...g, isArchived: true } : g)
      return resolve(ok({}, config))
    }
    const params = config.params ?? {}
    if (method === 'get' && !groupId) {
      let filtered = groups.filter((g) => g.isActive)
      return resolve(ok(filtered, config))
    }
    if (method === 'get') return resolve(ok(groups.find((g) => g.id === groupId) ?? groups[0], config))
    if (method === 'post') {
      const group = {
        id: uid(), isActive: true, studentCount: 0,
        roomId: null, schedule: null,
        ...body,
      } as typeof groups[0]
      groups.push(group)
      return resolve(created(group, config))
    }
    if (method === 'patch') {
      groups = groups.map((g) => g.id === groupId ? { ...g, ...body } : g)
      return resolve(ok(groups.find((g) => g.id === groupId), config))
    }
  }

  // ── Enrollments ────────────────────────────────────────────────────────────
  if (url.includes('/lms/enrollments')) {
    const enrollId = idFrom(url, 'enrollments')
    if (method === 'post') {
      const enrollment = { id: uid(), enrolledAt: new Date().toISOString(), status: 'active', ...body }
      return resolve(created(enrollment, config))
    }
    if (method === 'delete') return resolve(noContent(config))
  }

  // ── Lessons ────────────────────────────────────────────────────────────────

  if (url.includes('/lms/lessons')) {
    const lessonId = idFrom(url, 'lessons')

    if (url.includes('/conduct')) {
      lessons = lessons.map((l) => l.id === lessonId ? { ...l, status: 'completed' as const, topic: body.topic } : l)
      return resolve(ok(lessons.find((l) => l.id === lessonId), config))
    }

    if (url.includes('/cancel')) {
      lessons = lessons.map((l) => l.id === lessonId ? { ...l, status: 'cancelled' as const, cancelReason: body.reason } : l)
      return resolve(ok(lessons.find((l) => l.id === lessonId), config))
    }

    if (url.includes('/materials')) {
      return resolve(ok([], config))
    }

    if (url.includes('/full')) {
      const lesson = lessons.find((l) => l.id === lessonId) ?? lessons[0]
      return resolve(ok({
        lesson,
        attendance: DEMO_ATTENDANCE[lessonId] ?? [],
        grades:     DEMO_GRADES[lessonId] ?? [],
        diamonds:   DEMO_DIAMONDS[lessonId] ?? [],
        materials:  [],
      }, config))
    }

    if (url.includes('/bulk')) {
      // Bulk create: body has { groupId, roomId?, startDate, endDate, weekdays, startTime, endTime }
      const { groupId: bGroupId, roomId: bRoomId, teacherId: bTeacherId, startDate, endDate, weekdays: wdays, startTime: bStart, endTime: bEnd } = body
      const bGroup   = groups.find((g) => g.id === bGroupId) ?? groups[0]
      const bTeacherIdToUse = bTeacherId ?? DEMO_TEACHER_1.id
      const bTeacher = DEMO_USERS.find((u) => u.id === bTeacherIdToUse) ?? DEMO_TEACHER_1
      const bRoom    = bRoomId ? rooms.find((r) => r.id === bRoomId) ?? null : null
      const createdLessons: Lesson[] = []
      // Generate dates in range matching weekdays (ISO 1=Mon…7=Sun)
      let cur = parseISO(startDate)
      const endD = parseISO(endDate)
      while (cur <= endD) {
        if ((wdays as number[]).includes(getISODay(cur))) {
          const dateStr = cur.toISOString().slice(0, 10)
          const lesson: Lesson = {
            id: uid(), status: 'scheduled',
            cancelReason: null, topic: null, createdAt: new Date().toISOString(),
            subjectId: null, teacherId: bTeacher.id,
            roomId: bRoomId ?? null, isOnline: false,
            groupId: bGroupId, date: dateStr,
            startTime: bStart, endTime: bEnd,
          }
          lessons.push(lesson)
          createdLessons.push(lesson)
        }
        cur = addDays(cur, 1)
      }
      return resolve(created(createdLessons, config))
    }

    const params = config.params ?? {}
    if (method === 'get' && !lessonId) {
      let filtered = [...lessons]
      if (params.weekStart) {
        // Return lessons for the week starting from weekStart
        filtered = filtered.filter((l) => l.date >= params.weekStart)
        if (params.weekEnd) filtered = filtered.filter((l) => l.date <= params.weekEnd)
      }
      if (params.teacherId) filtered = filtered.filter((l) => l.teacherId === params.teacherId)
      if (params.groupId)   filtered = filtered.filter((l) => l.groupId === params.groupId)
      if (params.roomId)    filtered = filtered.filter((l) => l.roomId === params.roomId)
      return resolve(ok(filtered, config))
    }
    if (method === 'get') return resolve(ok(lessons.find((l) => l.id === lessonId) ?? lessons[0], config))
    if (method === 'post') {
      const group   = groups.find((g) => g.id === body.groupId) ?? groups[0]
      // Use teacherId from body if provided, otherwise fall back to subject's teacher
      const teacherIdToUse = body.teacherId ?? DEMO_TEACHER_1.id
      const teacher = DEMO_USERS.find((u) => u.id === teacherIdToUse) ?? DEMO_TEACHER_1
      const room    = rooms.find((r) => r.id === body.roomId) ?? null
      const lesson = {
        id: uid(), status: 'scheduled' as const,
        cancelReason: null, topic: null, createdAt: new Date().toISOString(),
        subjectId: body.subjectId ?? null, teacherId: teacher.id,
        roomId: body.roomId ?? null, isOnline: false,
        groupId: body.groupId, date: body.date, startTime: body.startTime, endTime: body.endTime,
      } as Lesson
      lessons.push(lesson)
      return resolve(created(lesson, config))
    }
    if (method === 'patch') {
      lessons = lessons.map((l) => l.id === lessonId ? { ...l, ...body } : l)
      return resolve(ok(lessons.find((l) => l.id === lessonId), config))
    }
  }

  // ── Students ───────────────────────────────────────────────────────────────

  if (url.includes('/lms/students')) {
    const studentId = idFrom(url, 'students')

    if (url.includes('/risk')) {
      return resolve(ok(DEMO_RISK_FACTORS[studentId] ?? null, config))
    }
    if (url.includes('/coins')) {
      return resolve(ok([], config))
    }

    const params = config.params ?? {}
    if (method === 'get' && !studentId) {
      let filtered = [...students]
      if (params.search) {
        const q = String(params.search).toLowerCase()
        filtered = filtered.filter((s) => s.fullName.toLowerCase().includes(q))
      }
      if (params.riskLevel) filtered = filtered.filter((s) => s.riskLevel === params.riskLevel)
      const page  = Number(params.page ?? 1)
      const limit = Number(params.limit ?? 20)
      return resolve(ok(paginate(filtered, page, limit), config))
    }
    if (method === 'get') return resolve(ok(students.find((s) => s.id === studentId) ?? students[0], config))
    if (method === 'post') {
      const student = { id: uid(), isActive: true, enrollments: [], riskLevel: 'normal' as const, riskLastUpdated: new Date().toISOString(), totalCoins: 0, badgeLevel: 'none' as const, gpa: null, attendancePercent: null, createdAt: new Date().toISOString(), photoUrl: null, email: null, dateOfBirth: null, parentName: null, parentPhone: null, fullName: body.fullName ?? '', phone: body.phone ?? null, ...body } as unknown as Student
      students.push(student)
      return resolve(created(student, config))
    }
    if (method === 'patch') {
      students = students.map((s) => s.id === studentId ? { ...s, ...body } : s)
      return resolve(ok(students.find((s) => s.id === studentId), config))
    }
  }

  // ── Homework submissions ────────────────────────────────────────────────────

  if (url.includes('/lms/homework/submissions')) {
    const subId = idFrom(url, 'submissions')
    if (url.includes('/review')) {
      hwSubmissions = hwSubmissions.map((s) => s.id === subId
        ? { ...s, ...body, status: 'reviewed' as const, reviewedAt: new Date().toISOString() }
        : s)
      return resolve(ok(hwSubmissions.find((s) => s.id === subId), config))
    }
    const params = config.params ?? {}
    if (method === 'get' && !subId) {
      const page  = Number(params.page ?? 1)
      const limit = Number(params.limit ?? 20)
      return resolve(ok(paginate(hwSubmissions, page, limit), config))
    }
    if (method === 'get') return resolve(ok(hwSubmissions.find((s) => s.id === subId) ?? hwSubmissions[0], config))
  }

  // ── Homework assignments ───────────────────────────────────────────────────
  if (url.includes('/lms/homework')) {
    const hwId = idFrom(url, 'homework')
    if (method === 'get') return resolve(ok(DEMO_HW_ASSIGNMENTS, config))
    if (method === 'post') {
      const lesson = lessons.find((l) => l.id === body.lessonId) ?? lessons[0]
      const hw = { id: uid(), lesson, createdAt: new Date().toISOString(), ...body }
      return resolve(created(hw, config))
    }
  }

  // ── Late Entry Requests ────────────────────────────────────────────────────

  if (url.includes('/lms/late-requests')) {
    const reqId = idFrom(url, 'late-requests')
    if (url.includes('/review')) {
      lateRequests = lateRequests.map((r) => r.id === reqId
        ? { ...r, ...body, reviewedBy: 'u2', reviewedAt: new Date().toISOString() }
        : r)
      return resolve(ok(lateRequests.find((r) => r.id === reqId), config))
    }
    const params = config.params ?? {}
    if (method === 'get' && !reqId) {
      let filtered = [...lateRequests]
      if (params.status) filtered = filtered.filter((r) => r.status === params.status)
      const page  = Number(params.page ?? 1)
      const limit = Number(params.limit ?? 20)
      return resolve(ok(paginate(filtered, page, limit), config))
    }
    if (method === 'get') return resolve(ok(lateRequests.find((r) => r.id === reqId) ?? lateRequests[0], config))
    if (method === 'post') {
      const lesson = lessons.find((l) => l.id === body.lessonId) ?? lessons[0]
      const req = {
        id: uid(), isApproved: null, reviewedByName: null, reviewedAt: null,
        createdAt: new Date().toISOString(), teacherId: 'u3', teacherName: 'Demo Teacher',
        lessonId: body.lessonId, lessonDate: lesson.date, lessonTopic: lesson.topic,
        groupName: null, reason: body.reason, status: 'pending' as const,
      } as LateEntryRequest
      lateRequests.push(req)
      return resolve(created(req, config))
    }
  }

  // ── MUP Tasks ──────────────────────────────────────────────────────────────

  if (url.includes('/lms/tasks')) {
    const taskId = idFrom(url, 'tasks')
    if (url.includes('/move')) {
      mupTasks = mupTasks.map((t) => t.id === taskId ? { ...t, status: body.status } : t)
      return resolve(ok(mupTasks.find((t) => t.id === taskId), config))
    }
    const params = config.params ?? {}
    if (method === 'get' && !taskId) {
      let filtered = [...mupTasks]
      if (params.status) filtered = filtered.filter((t) => t.status === params.status)
      return resolve(ok(filtered, config))
    }
    if (method === 'get') return resolve(ok(mupTasks.find((t) => t.id === taskId) ?? mupTasks[0], config))
    if (method === 'post') {
      const assignee = DEMO_USERS.find((u) => u.id === body.assignedTo) ?? DEMO_MUP
      const task = { id: uid(), status: 'pending' as const, dueDate: null, description: null, createdAt: new Date().toISOString(), assignee, ...body } as MupTask
      mupTasks.push(task)
      return resolve(created(task, config))
    }
    if (method === 'patch') {
      mupTasks = mupTasks.map((t) => t.id === taskId ? { ...t, ...body } : t)
      return resolve(ok(mupTasks.find((t) => t.id === taskId), config))
    }
    if (method === 'delete') {
      mupTasks = mupTasks.filter((t) => t.id !== taskId)
      return resolve(noContent(config))
    }
  }

  // ── Exams ──────────────────────────────────────────────────────────────────
  if (url.includes('/lms/exams')) {
    const examId = idFrom(url, 'exams')
    if (method === 'get' && !examId) return resolve(ok(exams, config))
    if (method === 'get') return resolve(ok(exams.find((e) => e.id === examId) ?? exams[0], config))
    if (method === 'post') {
      const group = groups.find((g) => g.id === body.groupId) ?? groups[0]
      const room  = rooms.find((r) => r.id === body.roomId) ?? null
      const exam = {
        id: uid(), status: 'upcoming' as const,
        title: body.title, groupId: body.groupId, groupName: group.name,
        date: body.date, startTime: body.startTime, endTime: body.endTime,
        description: body.description ?? null,
      } as Exam
      exams.push(exam)
      return resolve(created(exam, config))
    }
    if (method === 'patch') {
      exams = exams.map((e) => e.id === examId ? { ...e, ...body } : e)
      return resolve(ok(exams.find((e) => e.id === examId), config))
    }
    if (method === 'delete') {
      exams = exams.filter((e) => e.id !== examId)
      return resolve(noContent(config))
    }
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  if (url.includes('/lms/analytics/overview'))    return resolve(ok(DEMO_ANALYTICS_OVERVIEW, config))
  if (url.includes('/lms/analytics/attendance'))  return resolve(ok(DEMO_ANALYTICS_ATTENDANCE, config))
  if (url.includes('/lms/analytics/grades'))      return resolve(ok(DEMO_ANALYTICS_GRADES, config))
  if (url.includes('/lms/analytics/risk'))        return resolve(ok({ normal: 7, at_risk: 2, critical: 1 }, config))
  if (url.includes('/lms/analytics/homework-by-teacher')) {
    // Per-teacher homework review stats
    const summary = DEMO_USERS.filter((u) => u.role === 'teacher').map((teacher) => {
      const teacherSubs = hwSubmissions.filter((s) => {
        const hw = DEMO_HW_ASSIGNMENTS.find((a) => a.id === s.assignmentId)
        if (!hw) return false
        const lesson = lessons.find((l) => l.id === hw.lessonId)
        return lesson?.teacherId === teacher.id
      })
      const reviewed = teacherSubs.filter((s) => s.status === 'reviewed').length
      const submitted = teacherSubs.filter((s) => s.status === 'submitted').length
      const overdue   = teacherSubs.filter((s) => s.status === 'overdue').length
      const total     = teacherSubs.length
      return {
        teacherId:   teacher.id,
        teacherName: teacher.name,
        total,
        reviewed,
        pending: submitted,
        overdue,
        reviewRate: total > 0 ? Math.round((reviewed / total) * 100) : 0,
      }
    })
    return resolve(ok(summary, config))
  }
  if (url.includes('/lms/analytics/homework'))    return resolve(ok({ submittedRate: 68, reviewedRate: 42, overdueRate: 15 }, config))
  if (url.includes('/lms/analytics/teachers'))    return resolve(ok(DEMO_ANALYTICS_TEACHERS, config))

  // ── Reports ────────────────────────────────────────────────────────────────
  if (url.includes('/lms/reports/income')) {
    return resolve(ok([
      { month: '2026-01', total: 850000, byDirection: { 'Математика': 280000, 'Английский язык': 320000, 'Программирование': 250000 } },
      { month: '2026-02', total: 920000, byDirection: { 'Математика': 310000, 'Английский язык': 350000, 'Программирование': 260000 } },
      { month: '2026-03', total: 1050000, byDirection: { 'Математика': 350000, 'Английский язык': 410000, 'Программирование': 290000 } },
      { month: '2026-04', total: 780000, byDirection: { 'Математика': 260000, 'Английский язык': 310000, 'Программирование': 210000 } },
    ], config))
  }
  if (url.includes('/lms/reports/performance')) {
    const groupPerf = groups.map((g) => ({
      groupId:     g.id,
      groupName:   g.name,
      direction:   'N/A',
      teacher:     (lessons.find((l) => l.groupId === g.id) as any)?.teacher?.name ?? '',
      studentCount: g.studentCount,
      avgGrade:    6.5 + Math.random() * 2.5,
      attendance:  70 + Math.random() * 25,
      lessonsTotal: 12 + Math.floor(Math.random() * 8),
    }))
    return resolve(ok(groupPerf, config))
  }
  if (url.includes('/lms/reports/teacher-hours')) {
    const teachers = DEMO_USERS.filter((u) => u.role === 'teacher').map((t) => {
      const tLessons = lessons.filter((l) => l.teacherId === t.id && l.status === 'completed')
      const hours = tLessons.length * 1.5 // 90 min per lesson
      return {
        teacherId:   t.id,
        teacherName: t.name,
        lessonsTotal: lessons.filter((l) => l.teacherId === t.id).length,
        lessonsConducted: tLessons.length,
        hoursTotal: hours,
        groups: Array.from(new Set(lessons.filter((l) => l.teacherId === t.id).map((l) => l.groupId))).length,
      }
    })
    return resolve(ok(teachers, config))
  }
  if (url.includes('/lms/reports/by-direction')) {
    const dirs = DEMO_DIRECTIONS.map((dir) => {
      const dirGroups = groups.filter((_g) => true) // groups no longer have directionId
      const dirLessons = lessons.filter((l) => dirGroups.some((g) => g.id === l.groupId))
      return {
        directionId: dir.id,
        directionName: dir.name,
        color: dir.color,
        groupCount: dirGroups.length,
        studentCount: dirGroups.reduce((s, g) => s + g.studentCount, 0),
        lessonsTotal: dirLessons.length,
        lessonsConducted: dirLessons.filter((l) => l.status === 'completed').length,
        lessonsCancelled: dirLessons.filter((l) => l.status === 'cancelled').length,
      }
    })
    return resolve(ok(dirs, config))
  }

  // ── Compensation ───────────────────────────────────────────────────────────
  if (url.includes('/lms/compensation') || url.includes('/lms/salaries')) {
    const teacherId = idFrom(url, 'compensation')
    if (method === 'get' && !teacherId) return resolve(ok(compensations, config))
    if (method === 'get')  return resolve(ok(compensations.find((c) => c.teacherId === teacherId) ?? compensations[0], config))
    if (method === 'put') {
      const teacher = DEMO_USERS.find((u) => u.id === teacherId) ?? DEMO_TEACHER_1
      const comp = { id: uid(), teacherId, teacher, createdAt: new Date().toISOString(), isHybrid: false, ratePerLesson: null, fixedMonthlyRate: null, ratePerStudent: null, ...body } as CompensationModel
      compensations = compensations.map((c) => c.teacherId === teacherId ? comp : c)
      return resolve(ok(comp, config))
    }
    if (url.includes('/salaries')) return resolve(ok([], config))
  }

  // ── Finance payments ───────────────────────────────────────────────────────
  if (url.includes('/lms/finance/payments')) {
    const params = config.params ?? {}
    if (method === 'get') {
      let filtered = [...payments]
      if (params.status) filtered = filtered.filter((p) => p.status === params.status)
      return resolve(ok(filtered, config))
    }
    if (method === 'post') {
      const student = students.find((s) => s.id === body.studentId) ?? students[0]
      const payment = {
        id: uid(),
        studentId:   student.id,
        studentName: student.fullName,
        amount:      body.amount,
        month:       body.month,
        status:      'paid' as const,
        paidAt:      new Date().toISOString(),
        description: body.description ?? 'Оплата курса',
      }
      payments.push(payment)
      return resolve(created(payment, config))
    }
  }

  // Fallback
  return resolve(ok({}, config))
}
