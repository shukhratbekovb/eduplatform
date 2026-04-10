import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import {
  DEMO_STUDENT, DEMO_TOKEN, DEMO_ASSIGNMENTS, DEMO_LESSONS,
  DEMO_MATERIALS, DEMO_ACHIEVEMENTS, DEMO_PAYMENTS, DEMO_CONTACTS,
  DEMO_SUBJECTS, buildDashboard, DEMO_LEADERBOARD,
} from './data'
import type { Assignment } from '@/types/student'

// Mutable in-memory state
let assignments: Assignment[] = [...DEMO_ASSIGNMENTS]

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok(data: unknown, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
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

// ── Main adapter ──────────────────────────────────────────────────────────────
export const demoAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const url    = config.url ?? ''
  const method = (config.method ?? 'get').toLowerCase()
  const body   = parseBody(config.data)

  // Auth
  if (url.includes('/auth/login')) {
    return resolve(ok({ student: DEMO_STUDENT, accessToken: DEMO_TOKEN }, config))
  }

  // Dashboard
  if (url.includes('/student/dashboard')) {
    return resolve(ok(buildDashboard(), config))
  }

  // Leaderboard
  if (url.includes('/student/leaderboard')) {
    return resolve(ok(DEMO_LEADERBOARD, config))
  }

  // Assignments
  if (url.includes('/student/assignments')) {
    const assignmentId = idFrom(url, 'assignments')

    // Submit
    if (method === 'post' && url.includes('/submit')) {
      assignments = assignments.map((a) =>
        a.id === assignmentId ? { ...a, status: 'submitted' as const, submittedFileUrl: body.fileUrl ?? 'submitted_file' } : a
      )
      return resolve(ok({ success: true }, config))
    }

    // List
    if (method === 'get') {
      const { status } = config.params ?? {}
      const result = status ? assignments.filter((a) => {
        if (status === 'pending')   return a.status === 'pending' || a.status === 'overdue'
        if (status === 'submitted') return a.status === 'submitted'
        if (status === 'reviewed')  return a.status === 'reviewed'
        return true
      }) : assignments
      return resolve(ok(result, config))
    }
  }

  // Schedule
  if (url.includes('/student/schedule')) {
    const weekStart = config.params?.weekStart
    if (weekStart) {
      const lessons = DEMO_LESSONS.filter((l) => {
        const lessonDate = new Date(l.weekDate)
        const start = new Date(weekStart)
        const end = new Date(weekStart)
        end.setDate(end.getDate() + 6)
        return lessonDate >= start && lessonDate <= end
      })
      return resolve(ok(lessons, config))
    }
    return resolve(ok(DEMO_LESSONS, config))
  }

  // Materials
  if (url.includes('/student/materials')) {
    const { subjectId, language } = config.params ?? {}
    let result = [...DEMO_MATERIALS]
    if (subjectId) result = result.filter((m) => m.subjectId === subjectId)
    if (language)  result = result.filter((m) => m.language === language)
    return resolve(ok(result, config))
  }

  // Achievements
  if (url.includes('/student/achievements')) {
    return resolve(ok(DEMO_ACHIEVEMENTS, config))
  }

  // Payments
  if (url.includes('/student/payments')) {
    return resolve(ok(DEMO_PAYMENTS, config))
  }

  // Contacts
  if (url.includes('/student/contacts')) {
    return resolve(ok(DEMO_CONTACTS, config))
  }

  // Subjects
  if (url.includes('/student/subjects')) {
    return resolve(ok(DEMO_SUBJECTS, config))
  }

  // Performance
  if (url.includes('/student/performance')) {
    const subjectId = idFrom(url, 'performance') || config.params?.subjectId
    if (subjectId) {
      const subject = DEMO_SUBJECTS.find((s) => s.id === subjectId)
      if (!subject) return resolve(ok(null, config))
      const { DEMO_GRADES, DEMO_ATTENDANCE } = await import('./data')
      const grades = DEMO_GRADES.filter((g) => g.subjectId === subjectId)
      const att = DEMO_ATTENDANCE.filter((a) => a.subjectId === subjectId)
      const present = att.filter((a) => a.status === 'present').length
      const absent  = att.filter((a) => a.status === 'absent').length
      const late    = att.filter((a) => a.status === 'late').length
      const total   = att.length || 1
      const avg = grades.length ? grades.reduce((s, g) => s + g.value, 0) / grades.length : 0
      const level = avg >= 10 ? 'high' : avg >= 7 ? 'medium' : 'low'
      return resolve(ok({
        subject,
        level,
        levelDescription: '',
        pendingTasks: assignments.filter((a) => a.subjectId === subjectId && (a.status === 'pending' || a.status === 'overdue')).length,
        overdueTasks: assignments.filter((a) => a.subjectId === subjectId && a.status === 'overdue').length,
        attendance: {
          presentPercent: Math.round((present / total) * 100),
          absentPercent:  Math.round((absent  / total) * 100),
          latePercent:    Math.round((late    / total) * 100),
        },
        grades,
        attendanceCalendar: att,
      }, config))
    }
    return resolve(ok(DEMO_SUBJECTS, config))
  }

  // Profile update
  if (url.includes('/student/profile')) {
    return resolve(ok({ ...DEMO_STUDENT, ...body }, config))
  }

  // Fallback
  return resolve(ok({}, config))
}
