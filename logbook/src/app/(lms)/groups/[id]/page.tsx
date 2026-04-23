'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Calendar, Pencil, Plus, X, Search, UserMinus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useGroup, useGroupStudents, useGroupLessons } from '@/lib/hooks/lms/useGroups'
import { useStudents } from '@/lib/hooks/lms/useStudents'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { UserAvatar } from '@/components/ui/avatar'
import { RiskBadge } from '@/components/lms/students/RiskBadge'
import { GroupForm } from '@/components/lms/groups/GroupForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils/dates'
import { toast } from 'sonner'

export default function GroupDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const canManage = useIsDirectorOrMup()
  const qc = useQueryClient()

  const { data: group,    isLoading: gLoading } = useGroup(id)
  const { data: students = [] }                 = useGroupStudents(id)
  const { data: lessons  = [] }                 = useGroupLessons(id)

  const [showEdit, setShowEdit] = useState(false)
  const [showEnroll, setShowEnroll] = useState(false)

  const unenroll = useMutation({
    mutationFn: (enrollmentId: string) => apiClient.delete(`/lms/enrollments/${enrollmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'groups', id, 'students'] })
      toast.success('Студент отчислен из группы')
    },
    onError: () => toast.error('Ошибка'),
  })

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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{g.name}</h1>
            {g.directionName && <p className="text-sm text-gray-500 mt-0.5">{g.directionName}</p>}
          </div>
          {canManage && (
            <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>
              <Pencil className="w-4 h-4" />
              Редактировать
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
          <Stat icon={Users} label="Студентов" value={String(g.studentCount ?? (students as any[]).length)} />
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
            {canManage && (
              <div className="flex justify-end mb-3">
                <Button size="sm" variant="secondary" onClick={() => setShowEnroll(true)}>
                  <Plus className="w-4 h-4" />
                  Зачислить студента
                </Button>
              </div>
            )}

            {(students as any[]).length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">В группе нет студентов</p>
            ) : (
              <div className="space-y-2">
                {(students as any[]).map((student: any) => (
                  <div key={student.id} className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 transition-colors">
                    <Link href={`/students/${student.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <UserAvatar name={student.fullName} src={student.photoUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{student.fullName}</p>
                        {student.gpa != null && (
                          <p className="text-xs text-gray-400">ср. балл {Number(student.gpa).toFixed(1)}</p>
                        )}
                      </div>
                      <RiskBadge level={student.riskLevel ?? 'low'} size="sm" />
                    </Link>
                    {canManage && (
                      <button
                        onClick={() => {
                          if (confirm(`Отчислить ${student.fullName} из группы?`)) {
                            // Need enrollment ID — find via student+group
                            apiClient.delete(`/lms/enrollments/${student.id}`)
                              .then(() => {
                                qc.invalidateQueries({ queryKey: ['lms', 'groups', id, 'students'] })
                                toast.success('Студент отчислен')
                              })
                              .catch(() => toast.error('Ошибка'))
                          }
                        }}
                        className="p-1.5 text-gray-300 hover:text-danger-500 rounded shrink-0"
                        title="Отчислить"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                      {lesson.status === 'completed' ? 'Проведён' : lesson.status === 'cancelled' ? 'Отменён' : 'Запланирован'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <GroupForm open={showEdit} onOpenChange={setShowEdit} editGroup={g} />
      <EnrollStudentDialog open={showEnroll} onOpenChange={setShowEnroll} groupId={id} enrolledStudentIds={(students as any[]).map((s: any) => s.id)} />
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

// ── Enroll student dialog ───────────────────────────────────────────────────

function EnrollStudentDialog({ open, onOpenChange, groupId, enrolledStudentIds }: {
  open: boolean; onOpenChange: (v: boolean) => void
  groupId: string; enrolledStudentIds: string[]
}) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data } = useStudents({ search: search || undefined, limit: 20 } as any)
  const allStudents = (data as any)?.data ?? []

  const available = allStudents.filter((s: any) => !enrolledStudentIds.includes(s.id))

  const enroll = useMutation({
    mutationFn: (studentId: string) =>
      apiClient.post('/lms/enrollments', { student_id: studentId, group_id: groupId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'groups', groupId, 'students'] })
      qc.invalidateQueries({ queryKey: ['lms', 'groups'] })
      toast.success('Студент зачислен')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Ошибка зачисления'
      toast.error(msg)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Зачислить студента</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Поиск по имени..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {available.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              {search ? 'Студенты не найдены' : 'Введите имя для поиска'}
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {available.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => enroll.mutate(s.id)}
                  disabled={enroll.isPending}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary-50 text-left transition-colors"
                >
                  <UserAvatar name={s.fullName} src={s.photoUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.fullName}</p>
                    <p className="text-xs text-gray-400">{s.phone ?? s.email ?? ''}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
