'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Users, AlertTriangle, CheckCircle2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useLessonFull } from '@/lib/hooks/lms/useSchedule'
import { useConductLesson } from '@/lib/hooks/lms/useSchedule'
import { useCreateLateRequest } from '@/lib/hooks/lms/useLateRequests'
import { useLateRequests } from '@/lib/hooks/lms/useLateRequests'
import { useGroupStudents } from '@/lib/hooks/lms/useGroups'
import { isLessonEditable, canEditViaLateRequest, needsLateRequest, getLessonWindowRemaining } from '@/lib/utils/lessonWindow'
import { formatLessonDate } from '@/lib/utils/dates'
import { useIsTeacher, useCurrentUser } from '@/lib/stores/useAuthStore'
import { AttendanceTable } from '@/components/lms/lessons/AttendanceTable'
import { GradeInputTable } from '@/components/lms/lessons/GradeInput'
import { DiamondDistributor } from '@/components/lms/lessons/DiamondDistributor'
import { LessonStatusBadge } from '@/components/lms/lessons/LessonStatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils/cn'
import type { AttendanceStatus } from '@/types/lms'

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const user    = useCurrentUser()

  const { data, isLoading } = useLessonFull(id)
  const { data: lateReqData } = useLateRequests({ status: 'approved' })
  // Fetch group students as fallback when lesson hasn't been conducted yet
  const groupId = data?.lesson.group.id ?? ''
  const { data: groupStudents = [] } = useGroupStudents(groupId)
  const { mutate: conduct, isPending: isConducting } = useConductLesson()
  const { mutate: requestLate, isPending: isRequesting } = useCreateLateRequest()

  const approvedRequests = (lateReqData as any)?.data ?? []

  // Local form state
  const [topic, setTopic]       = useState('')
  const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus; note: string }>>({})
  const [grades, setGrades]     = useState<Record<string, { grade: number | null; comment: string }>>({})
  const [diamonds, setDiamonds] = useState<Record<string, number>>({})
  const [lateReason, setLateReason] = useState('')
  const [showLateForm, setShowLateForm] = useState(false)

  // Init form from API data
  useEffect(() => {
    if (!data) return
    setTopic(data.lesson.topic ?? '')

    const att: typeof attendance = {}
    const grd: typeof grades = {}
    const dia: typeof diamonds = {}

    data.attendance.forEach((r) => {
      att[r.studentId] = { status: r.status, note: r.note ?? '' }
    })
    data.grades.forEach((r) => {
      grd[r.studentId] = { grade: r.grade, comment: r.comment ?? '' }
    })
    data.diamonds.forEach((r) => {
      dia[r.studentId] = r.diamonds
    })
    setAttendance(att)
    setGrades(grd)
    setDiamonds(dia)
  }, [data])

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  const { lesson } = data
  const editable = isLessonEditable(lesson) || canEditViaLateRequest(lesson, approvedRequests)
  const windowRemaining = getLessonWindowRemaining(lesson)
  const needsRequest = needsLateRequest(lesson)

  // Build rows for components
  // When lesson hasn't been conducted yet, attendance is empty — fall back to group students
  const studentList = data.attendance.length > 0
    ? data.attendance.map((r) => r.student)
    : (groupStudents as any[])

  const attendanceRows = studentList.map((s) => ({
    studentId: s.id,
    student:   s,
    status:    attendance[s.id]?.status ?? 'on_time' as AttendanceStatus,
    note:      attendance[s.id]?.note ?? '',
  }))

  const gradeRows = studentList
    .filter((s) => (attendance[s.id]?.status ?? 'on_time') !== 'absent')
    .map((s) => ({
      studentId: s.id,
      student:   s,
      grade:     grades[s.id]?.grade ?? null,
      comment:   grades[s.id]?.comment ?? '',
    }))

  const diamondRows = studentList
    .filter((s) => (attendance[s.id]?.status ?? 'on_time') !== 'absent')
    .map((s) => ({
      studentId: s.id,
      student:   s,
      diamonds:  diamonds[s.id] ?? 0,
    }))

  const handleAttendanceChange = (studentId: string, field: 'status' | 'note', value: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }))
  }

  const handleGradeChange = (studentId: string, field: 'grade' | 'comment', value: string | number) => {
    setGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: field === 'grade' ? (Number(value) || null) : value,
      },
    }))
  }

  const handleDiamondChange = (studentId: string, val: number) => {
    setDiamonds((prev) => ({ ...prev, [studentId]: val }))
  }

  const canSave = editable && !!topic.trim()

  const handleSave = () => {
    if (!canSave) return

    // Validate grade < 6 comments
    const missingComments = gradeRows.filter(
      (r) => r.grade !== null && r.grade < 6 && !grades[r.studentId]?.comment?.trim()
    )
    if (missingComments.length > 0) {
      toast.error('Добавьте комментарий для оценок ниже 6')
      return
    }

    conduct({
      id,
      data: {
        topic: topic.trim(),
        attendance: attendanceRows.map((r) => ({
          studentId: r.studentId,
          status:    r.status,
          note:      r.note || undefined,
        })),
        grades: gradeRows
          .filter((r) => r.grade !== null)
          .map((r) => ({
            studentId: r.studentId,
            grade:     r.grade!,
            comment:   r.comment || undefined,
          })),
        diamonds: diamondRows
          .filter((r) => r.diamonds > 0)
          .map((r) => ({ studentId: r.studentId, diamonds: r.diamonds })),
      },
    })
  }

  const handleLateRequest = () => {
    if (!lateReason.trim()) return
    requestLate({ lessonId: lesson.id, reason: lateReason }, {
      onSuccess: () => { setShowLateForm(false); setLateReason('') },
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад к расписанию
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LessonStatusBadge status={lesson.status} />
              {windowRemaining && (
                <span className="text-xs text-warning-600 bg-warning-50 px-2 py-0.5 rounded-full font-medium">
                  ⏱ {windowRemaining}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-2">{lesson.group.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {formatLessonDate(lesson.date)} · {lesson.startTime} – {lesson.endTime}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              {lesson.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {lesson.room.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {lesson.teacher.name}
              </span>
            </div>
          </div>
        </div>

        {/* Late request section */}
        {needsRequest && !editable && (
          <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-md">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger-700">Окно ввода данных истекло</p>
                <p className="text-xs text-danger-600">Для внесения данных необходим запрос МУП</p>
              </div>
            </div>
            {!showLateForm ? (
              <Button size="sm" variant="danger" onClick={() => setShowLateForm(true)}>
                Подать запрос на позднее внесение
              </Button>
            ) : (
              <div className="space-y-2 mt-2">
                <textarea
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder="Причина позднего внесения данных…"
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-primary-500"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowLateForm(false)}>Отмена</Button>
                  <Button size="sm" loading={isRequesting} disabled={!lateReason.trim()} onClick={handleLateRequest}>
                    <Send className="w-3.5 h-3.5" />
                    Отправить запрос
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Topic input */}
      {editable && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Тема урока <span className="text-danger-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Введите тему урока…"
            className={cn(
              'w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:border-primary-500',
              !topic.trim() ? 'border-gray-300' : 'border-primary-300 bg-primary-50/30'
            )}
          />
        </div>
      )}

      {lesson.status === 'conducted' && lesson.topic && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Тема урока</p>
          <p className="text-sm font-medium text-gray-900">{lesson.topic}</p>
        </div>
      )}

      {/* Data tabs */}
      {studentList.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Tabs defaultValue="attendance">
            <div className="px-4 border-b border-gray-200">
              <TabsList className="border-none">
                <TabsTrigger value="attendance">Посещаемость</TabsTrigger>
                <TabsTrigger value="grades">Оценки</TabsTrigger>
                <TabsTrigger value="diamonds">Бриллианты</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="attendance" className="p-4">
              <AttendanceTable
                rows={attendanceRows}
                onChange={handleAttendanceChange}
                readonly={!editable}
              />
            </TabsContent>

            <TabsContent value="grades" className="p-4">
              <GradeInputTable
                rows={gradeRows}
                onChange={handleGradeChange}
                readonly={!editable}
              />
            </TabsContent>

            <TabsContent value="diamonds" className="p-4">
              <DiamondDistributor
                rows={diamondRows}
                onChange={handleDiamondChange}
                readonly={!editable}
              />
            </TabsContent>
          </Tabs>

          {/* Save */}
          {editable && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {!topic.trim() ? '⚠ Укажите тему урока' : '✓ Готово к сохранению'}
              </p>
              <Button
                size="md"
                loading={isConducting}
                disabled={!canSave}
                onClick={handleSave}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Сохранить и закрыть урок
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
