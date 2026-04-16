export const lmsKeys = {
  // Auth
  me: ()   => ['lms', 'me'] as const,
  users: () => ['lms', 'users'] as const,

  // Notifications
  notifications: () => ['lms', 'notifications'] as const,

  // Schedule / Lessons
  schedule:     (filters: Record<string, unknown>) => ['lms', 'schedule', filters] as const,
  lesson:       (id: string) => ['lms', 'lessons', id] as const,
  lessonData:   (id: string) => ['lms', 'lessons', id, 'data'] as const,   // attendance + grades + diamonds

  // Groups
  groups:       (filters?: Record<string, unknown>) => ['lms', 'groups', filters ?? {}] as const,
  group:        (id: string) => ['lms', 'groups', id] as const,
  groupLessons: (id: string) => ['lms', 'groups', id, 'lessons'] as const,

  // Students
  students:     (filters?: Record<string, unknown>) => ['lms', 'students', filters ?? {}] as const,
  student:      (id: string) => ['lms', 'students', id] as const,
  studentRisk:  (id: string) => ['lms', 'students', id, 'risk'] as const,
  studentCoins: (id: string) => ['lms', 'students', id, 'coins'] as const,

  // Homework
  homework:           (filters?: Record<string, unknown>) => ['lms', 'homework', filters ?? {}] as const,
  homeworkSubmission: (id: string) => ['lms', 'homework', 'submissions', id] as const,

  // Late requests
  lateRequests: (filters?: Record<string, unknown>) => ['lms', 'late-requests', filters ?? {}] as const,
  lateRequest:  (id: string) => ['lms', 'late-requests', id] as const,

  // MUP tasks
  mupTasks: (filters?: Record<string, unknown>) => ['lms', 'mup-tasks', filters ?? {}] as const,
  mupTask:  (id: string) => ['lms', 'mup-tasks', id] as const,

  // Analytics
  analyticsOverview:     (f: Record<string, unknown>) => ['lms', 'analytics', 'overview', f] as const,
  analyticsAttendance:   (f: Record<string, unknown>) => ['lms', 'analytics', 'attendance', f] as const,
  analyticsGrades:       (f: Record<string, unknown>) => ['lms', 'analytics', 'grades', f] as const,
  analyticsRisk:         (f: Record<string, unknown>) => ['lms', 'analytics', 'risk', f] as const,
  analyticsHomework:     (f: Record<string, unknown>) => ['lms', 'analytics', 'homework', f] as const,
  analyticsTeachers:     (f: Record<string, unknown>) => ['lms', 'analytics', 'teachers', f] as const,

  // Compensation
  compensations: () => ['lms', 'compensations'] as const,
  compensation:  (teacherId: string) => ['lms', 'compensations', teacherId] as const,
  salaries:      (period?: string) => ['lms', 'salaries', period ?? ''] as const,

  // Settings
  directions: () => ['lms', 'settings', 'directions'] as const,
  direction:  (id: string) => ['lms', 'settings', 'directions', id] as const,
  subjects:   (directionId?: string) => ['lms', 'settings', 'subjects', directionId ?? ''] as const,
  rooms:      () => ['lms', 'settings', 'rooms'] as const,
} as const
