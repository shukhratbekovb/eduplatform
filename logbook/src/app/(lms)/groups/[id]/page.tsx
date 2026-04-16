'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Calendar, BookOpen } from 'lucide-react'
import { useGroup, useGroupStudents, useGroupLessons } from '@/lib/hooks/lms/useGroups'
import { useSubjects, useLmsUsers } from '@/lib/hooks/lms/useSettings'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/avatar'
import { RiskBadge } from '@/components/lms/students/RiskBadge'
import { formatDate } from '@/lib/utils/dates'
import { useMemo } from 'react'

export default function GroupDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const { data: group,    isLoading: gLoading } = useGroup(id)
  const { data: students = [] }                 = useGroupStudents(id)
  const { data: lessons  = [] }                 = useGroupLessons(id)
  const { data: subjects = [] }                 = useSubjects()
  const { data: allUsers = [] }                 = useLmsUsers()

  const subject = useMemo(() => (subjects as any[]).find((s: any) => s.id === (group as any)?.subjectId), [subjects, group])
  const teacher = useMemo(() => (allUsers as any[]).find((u: any) => u.id === (group as any)?.teacherId), [allUsers, group])

  if (gLoading || !group) {
    return <div className="flex items-center justify-center py-24">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
    </div>
  }

  const g = group as any

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Назад к группам
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{g.name}</h1>
        {subject && <p className="text-gray-500 mt-1">{subject.name}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <Stat icon={Users} label="Студентов" value={String(g.studentCount ?? (students as any[]).length)} />
          <Stat icon={BookOpen} label="Преподаватель" value={teacher?.name?.split(' ')[0] ?? '—'} />
          <Stat icon={Calendar} label="Начало" value={formatDate(g.startDate)} />
          <Stat icon={Calendar} label="Окончание" value={formatDate(g.endDate)} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs defaultValue="students">
          <div className="px-4 border-b border-gray-200">
            <TabsList className="border-none">
              <TabsTrigger value="students">Студенты ({(students as any[]).length})</TabsTrigger>
              <TabsTrigger value="lessons">Уроки ({(lessons as any[]).length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="students" className="p-4">
            {(students as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">В группе нет студентов</p>
            ) : (
              <div className="space-y-2">
                {(students as any[]).map((student: any) => (
                  <Link
                    key={student.id}
                    href={`/students/${student.id}`}
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <UserAvatar name={student.fullName} src={student.photoUrl} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                      {student.gpa != null && (
                        <p className="text-xs text-gray-400">ср. балл {Number(student.gpa).toFixed(1)}</p>
                      )}
                    </div>
                    <RiskBadge level={student.riskLevel ?? 'low'} size="sm" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lessons" className="p-4">
            {(lessons as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Нет уроков</p>
            ) : (
              <div className="space-y-2">
                {(lessons as any[]).sort((a: any, b: any) => (a.date ?? '').localeCompare(b.date ?? '')).map((lesson: any) => (
                  <Link
                    key={lesson.id}
                    href={`/lessons/${lesson.id}`}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 border border-gray-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lesson.date} · {lesson.startTime}–{lesson.endTime}</p>
                      {lesson.topic && <p className="text-xs text-gray-400 mt-0.5">{lesson.topic}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      lesson.status === 'completed' ? 'bg-success-50 text-success-700' :
                      lesson.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                      'bg-primary-50 text-primary-700'
                    }`}>
                      {lesson.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
