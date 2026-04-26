'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, Users, AlertTriangle, CheckCircle2, Send, Plus, FileText, BookOpen, Trash2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
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
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import type { AttendanceStatus } from '@/types/lms'

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const user    = useCurrentUser()
  const t       = useT()

  const { data, isLoading } = useLessonFull(id)
  const { data: lateReqData } = useLateRequests({ status: 'approved' })
  const groupId = data?.lesson.groupId ?? ''
  const { data: groupStudents = [] } = useGroupStudents(groupId)

  // Resolve names for header
  const { data: groupInfo } = useQuery({
    queryKey: ['lms', 'groups', groupId],
    queryFn: () => apiClient.get(`/lms/groups/${groupId}`).then((r) => r.data),
    enabled: !!groupId,
  })
  const { data: allUsers = [] } = useQuery({
    queryKey: ['lms', 'staff-lookup'],
    queryFn: () => apiClient.get('/lms/users').then((r) => r.data as any[]),
    staleTime: 10 * 60_000,
  })
  const { data: allRooms = [] } = useQuery({
    queryKey: ['lms', 'rooms-lookup'],
    queryFn: () => apiClient.get('/lms/rooms').then((r) => r.data as any[]),
    staleTime: 10 * 60_000,
  })
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['lms', 'subjects-lookup'],
    queryFn: () => apiClient.get('/lms/subjects').then((r) => r.data as any[]),
    staleTime: 10 * 60_000,
  })
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
    data.grades.forEach((r: any) => {
      grd[r.studentId] = { grade: r.value ?? r.grade ?? null, comment: r.comment ?? '' }
    })
    data.diamonds.forEach((r: any) => {
      dia[r.studentId] = r.amount ?? r.diamonds ?? 0
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
  const isTeacherRole = user?.role === 'teacher'
  const editable = isTeacherRole && (isLessonEditable(lesson) || canEditViaLateRequest(lesson, approvedRequests))
  const windowRemaining = getLessonWindowRemaining(lesson)
  const needsRequest = needsLateRequest(lesson)

  // Always use group students for the student list
  const studentList = (groupStudents as any[])

  const attendanceRows = studentList.map((s) => ({
    studentId: s.id,
    student:   s,
    status:    attendance[s.id]?.status ?? 'present' as AttendanceStatus,
    note:      attendance[s.id]?.note ?? '',
  }))

  const gradeRows = studentList
    .filter((s) => (attendance[s.id]?.status ?? 'present') !== 'absent')
    .map((s) => ({
      studentId: s.id,
      student:   s,
      grade:     grades[s.id]?.grade ?? null,
      comment:   grades[s.id]?.comment ?? '',
    }))

  const diamondRows = studentList
    .filter((s) => (attendance[s.id]?.status ?? 'present') !== 'absent')
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
      toast.error(t('grade.commentError'))
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
        {t('lesson.backToSchedule')}
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
            <h1 className="text-xl font-bold text-gray-900 mt-2">{(groupInfo as any)?.name ?? t('lesson.lesson')}</h1>
            {(groupInfo as any)?.directionName && (
              <p className="text-xs text-gray-400 mt-0.5">{(groupInfo as any).directionName}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {formatLessonDate(lesson.date)} · {lesson.startTime} – {lesson.endTime}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              {lesson.subjectId && (() => {
                const subj = (allSubjects as any[]).find((s: any) => s.id === lesson.subjectId)
                return subj ? <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{subj.name}</span> : null
              })()}
              {lesson.teacherId && (() => {
                const teacher = (allUsers as any[]).find((u: any) => u.id === lesson.teacherId)
                return teacher ? <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{teacher.name}</span> : null
              })()}
              {lesson.roomId && (() => {
                const room = (allRooms as any[]).find((r: any) => r.id === lesson.roomId)
                return room ? <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{room.name}</span> : null
              })()}
            </div>
          </div>
        </div>

        {/* Late request section */}
        {needsRequest && !editable && (
          <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-md">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-danger-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-danger-700">{t('lesson.windowExpired')}</p>
                <p className="text-xs text-danger-600">{t('lesson.needMupRequest')}</p>
              </div>
            </div>
            {!showLateForm ? (
              <Button size="sm" variant="danger" onClick={() => setShowLateForm(true)}>
                {t('lesson.submitLateRequest')}
              </Button>
            ) : (
              <div className="space-y-2 mt-2">
                <textarea
                  value={lateReason}
                  onChange={(e) => setLateReason(e.target.value)}
                  placeholder={t('lesson.lateReasonPlaceholder')}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-primary-500"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowLateForm(false)}>{t('common.cancel')}</Button>
                  <Button size="sm" loading={isRequesting} disabled={!lateReason.trim()} onClick={handleLateRequest}>
                    <Send className="w-3.5 h-3.5" />
                    {t('lesson.sendRequest')}
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
            {t('lesson.topicLabel')} <span className="text-danger-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('lesson.topicPlaceholder')}
            className={cn(
              'w-full text-sm border rounded-md px-3 py-2 focus:outline-none focus:border-primary-500',
              !topic.trim() ? 'border-gray-300' : 'border-primary-300 bg-primary-50/30'
            )}
          />
        </div>
      )}

      {lesson.status === 'completed' && lesson.topic && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('lesson.topicLabel')}</p>
          <p className="text-sm font-medium text-gray-900">{lesson.topic}</p>
        </div>
      )}

      {/* Data tabs */}
      {studentList.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Tabs defaultValue="attendance">
            <div className="px-4 border-b border-gray-200">
              <TabsList className="border-none">
                <TabsTrigger value="attendance">{t('attendance.title')}</TabsTrigger>
                <TabsTrigger value="grades">{t('lesson.grades')}</TabsTrigger>
                <TabsTrigger value="diamonds">{t('lesson.diamonds')}</TabsTrigger>
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
                {!topic.trim() ? `⚠ ${t('lesson.specifyTopic')}` : `✓ ${t('lesson.readyToSave')}`}
              </p>
              <Button
                size="md"
                loading={isConducting}
                disabled={!canSave}
                onClick={handleSave}
                className="gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('lesson.saveAndClose')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Materials & Homework */}
      <LessonContent lessonId={id} />
    </div>
  )
}


// ── File upload helper ───────────────────────────────────────────────────────

async function uploadFiles(files: File[], folder: string): Promise<{ url: string; filename: string; key: string }[]> {
  const results: { url: string; filename: string; key: string }[] = []
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const res = await apiClient.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    results.push({ url: res.data.url, filename: res.data.filename, key: res.data.key })
  }
  return results
}

// ── Materials & Homework ────────────────────────────────────────────────────

function LessonContent({ lessonId }: { lessonId: string }) {
  const t = useT()
  const qc = useQueryClient()

  // Materials
  const { data: materials = [] } = useQuery({
    queryKey: ['lms', 'lesson-materials', lessonId],
    queryFn: () => apiClient.get(`/lms/lessons/${lessonId}/materials`).then((r) => r.data as any[]),
  })
  const deleteMaterial = useMutation({
    mutationFn: (materialId: string) => apiClient.delete(`/lms/lessons/${lessonId}/materials/${materialId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms', 'lesson-materials', lessonId] }); toast.success(t('common.delete')) },
  })

  // Homework
  const { data: assignments = [] } = useQuery({
    queryKey: ['lms', 'lesson-homework', lessonId],
    queryFn: () => apiClient.get('/lms/homework/assignments', { params: { lesson_id: lessonId } }).then((r) => r.data as any[]),
  })

  // Upload states
  const [uploading, setUploading] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showHomeworkForm, setShowHomeworkForm] = useState(false)
  const [hwTitle, setHwTitle] = useState('')
  const [hwDesc, setHwDesc] = useState('')
  const [hwDue, setHwDue] = useState('')
  const [hwFiles, setHwFiles] = useState<File[]>([])
  const matInputRef = useRef<HTMLInputElement>(null)

  // Handle material file upload
  const handleMaterialFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    try {
      const uploaded = await uploadFiles(files, 'materials')
      // Save each as lesson material
      for (const f of uploaded) {
        const ext = f.filename.split('.').pop()?.toLowerCase() ?? ''
        const type = ['pdf'].includes(ext) ? 'pdf' : ['mp4', 'webm', 'mov'].includes(ext) ? 'video' : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : 'other'
        await apiClient.post(`/lms/lessons/${lessonId}/materials`, { title: f.filename, url: f.url, type, key: f.key })
      }
      qc.invalidateQueries({ queryKey: ['lms', 'lesson-materials', lessonId] })
      toast.success(t('lesson.filesUploaded'))
    } catch {
      toast.error(t('lesson.uploadError'))
    } finally {
      setUploading(false)
      if (matInputRef.current) matInputRef.current.value = ''
    }
  }

  // Handle adding a link
  const handleAddLink = async () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return
    try {
      await apiClient.post(`/lms/lessons/${lessonId}/materials`, {
        title: linkTitle.trim(), url: linkUrl.trim(), type: 'link',
      })
      qc.invalidateQueries({ queryKey: ['lms', 'lesson-materials', lessonId] })
      toast.success(t('lesson.linkAdded'))
      setLinkTitle(''); setLinkUrl(''); setShowLinkForm(false)
    } catch {
      toast.error(t('common.error'))
    }
  }

  // Handle homework creation with files
  const handleAddHomework = async () => {
    if (!hwTitle.trim() || !hwDue) return
    setUploading(true)
    try {
      // Upload files first
      let fileUrls: { url: string; filename: string }[] = []
      if (hwFiles.length > 0) {
        fileUrls = await uploadFiles(hwFiles, 'homework')
      }
      // Create assignment with file_urls
      await apiClient.post('/lms/homework/assignments', {
        lesson_id: lessonId, title: hwTitle.trim(),
        description: hwDesc.trim() || undefined,
        due_date: hwDue + 'T23:59:00',
        file_urls: fileUrls,
      })
      qc.invalidateQueries({ queryKey: ['lms', 'lesson-homework', lessonId] })
      toast.success(t('lesson.homeworkAdded'))
      setHwTitle(''); setHwDesc(''); setHwDue(''); setHwFiles([])
      setShowHomeworkForm(false)
    } catch {
      toast.error(t('common.error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-4">
      <Tabs defaultValue="materials">
        <div className="px-4 border-b border-gray-200">
          <TabsList className="border-none">
            <TabsTrigger value="materials">{t('lesson.materials')} ({materials.length})</TabsTrigger>
            <TabsTrigger value="homework">{t('lesson.homework')} ({assignments.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Materials tab */}
        <TabsContent value="materials" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{t('lesson.lessonMaterials')}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowLinkForm(true)}>
                {t('lesson.addLink')}
              </Button>
              <input
                ref={matInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleMaterialFiles}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.webm,.zip"
              />
              <Button size="sm" variant="secondary" onClick={() => matInputRef.current?.click()} loading={uploading}>
                <Plus className="w-4 h-4" />
                {t('lesson.uploadFiles')}
              </Button>
            </div>
          </div>

          {/* Add link form */}
          {showLinkForm && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <Input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder={t('lesson.linkTitlePlaceholder')} />
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => setShowLinkForm(false)}>{t('common.cancel')}</Button>
                <Button size="sm" onClick={handleAddLink} disabled={!linkTitle.trim() || !linkUrl.trim()}>{t('common.add')}</Button>
              </div>
            </div>
          )}

          {materials.length === 0 ? (
            <div
              onClick={() => matInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
            >
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('lesson.clickToUpload')}</p>
              <p className="text-xs text-gray-300 mt-1">{t('lesson.fileTypes')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {materials.map((m: any) => {
                const isLink = m.type === 'link'
                const hasKey = !!m.s3Key
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                        <p className="text-xs text-gray-400">{m.type} · {m.language ?? 'ru'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLink ? (
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                          {t('common.open')} ↗
                        </a>
                      ) : hasKey ? (
                        <button
                          onClick={async () => {
                            const res = await apiClient.get('/files/download', { params: { key: m.s3Key, filename: m.title }, responseType: 'blob' })
                            const url = URL.createObjectURL(res.data)
                            const a = document.createElement('a'); a.href = url; a.download = m.title; a.click()
                            URL.revokeObjectURL(url)
                          }}
                          className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                          {t('common.download')}
                        </button>
                      ) : (
                        <a href={m.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary-600 hover:underline">{t('common.open')}</a>
                      )}
                      <button onClick={() => deleteMaterial.mutate(m.id)}
                        className="p-1 text-gray-300 hover:text-danger-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Homework tab */}
        <TabsContent value="homework" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{t('lesson.homework')}</p>
            <Button size="sm" variant="secondary" onClick={() => setShowHomeworkForm(true)}>
              <Plus className="w-4 h-4" />
              {t('common.add')}
            </Button>
          </div>

          {assignments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{t('lesson.noHomework')}</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((hw: any) => (
                <div key={hw.id} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{hw.title}</p>
                      {hw.description && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{hw.description}</p>}
                      {hw.file_urls && hw.file_urls.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {hw.file_urls.map((f: any, i: number) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs hover:bg-primary-100 transition-colors">
                              <FileText className="w-3 h-3" />
                              {f.filename}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0 ml-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {hw.due_date ? new Date(hw.due_date).toLocaleDateString('ru-RU') : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add homework dialog */}
          <Dialog open={showHomeworkForm} onOpenChange={setShowHomeworkForm}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{t('lesson.newHomework')}</DialogTitle></DialogHeader>
              <DialogBody>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.name')} *</label>
                    <Input value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} placeholder={t('lesson.homeworkTitlePlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.description')}</label>
                    <textarea
                      value={hwDesc} onChange={(e) => setHwDesc(e.target.value)}
                      placeholder={t('lesson.homeworkDescPlaceholder')}
                      rows={3}
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('lesson.deadline')} *</label>
                    <DatePicker value={hwDue} onChange={setHwDue} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t('lesson.attachFiles')}</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setHwFiles(Array.from(e.target.files ?? []))}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    {hwFiles.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{hwFiles.length} {t('lesson.filesSelected')}</p>
                    )}
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setShowHomeworkForm(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleAddHomework} loading={uploading} disabled={!hwTitle.trim() || !hwDue}>
                  {t('common.add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
