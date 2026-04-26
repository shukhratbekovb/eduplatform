'use client'
import { useState } from 'react'
import { GraduationCap, Plus, X, Calendar, Clock, BookOpen, Users, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { useSubjects } from '@/lib/hooks/lms/useSettings'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import type { Exam } from '@/types/lms'

// ── Hooks ────────────────────────────────────────────────────────────────────

function useExams() {
  return useQuery({
    queryKey: ['lms', 'exams'],
    queryFn: () => apiClient.get<Exam[]>('/lms/exams').then((r) => r.data),
  })
}

function useCreateExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => apiClient.post<Exam>('/lms/exams', data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms', 'exams'] }) },
  })
}

function useDeleteExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/lms/exams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms', 'exams'] }) },
  })
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const t = useT()
  const [showForm, setShowForm] = useState(false)
  const [gradeExamId, setGradeExamId] = useState<string | null>(null)
  const canManage = useIsDirectorOrMup()

  const { data: exams = [], isLoading } = useExams()
  const { mutate: deleteExam } = useDeleteExam()

  const STATUS_CFG: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    upcoming:    { label: t('exams.statusUpcoming'),    variant: 'default' },
    in_progress: { label: t('exams.statusInProgress'),  variant: 'warning' },
    completed:   { label: t('exams.statusCompleted'),   variant: 'success' },
    cancelled:   { label: t('exams.statusCancelled'),   variant: 'danger' },
  }

  const upcoming = (exams as Exam[]).filter((e) => e.status === 'upcoming' || e.status === 'in_progress')
  const past     = (exams as Exam[]).filter((e) => e.status === 'completed' || e.status === 'cancelled')

  const handleDelete = (id: string) => {
    deleteExam(id, {
      onSuccess: () => toast.success(t('exams.deleted')),
      onError: () => toast.error(t('exams.deleteError')),
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-600" />
          {t('exams.title')}
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            {t('exams.add')}
          </Button>
        )}
      </div>

      <ExamForm open={showForm} onOpenChange={setShowForm} />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : (exams as Exam[]).length === 0 ? (
        <EmptyState icon={GraduationCap} title={t('exams.noExams')} description={t('exams.willAppear')} />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('exams.upcoming')}</h2>
              <div className="space-y-2">
                {upcoming.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} canManage={canManage} statusCfg={STATUS_CFG}
                    onDelete={() => handleDelete(exam.id)}
                    onGrade={() => setGradeExamId(exam.id)} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('exams.past')}</h2>
              <div className="space-y-2">
                {past.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} canManage={canManage} statusCfg={STATUS_CFG}
                    onDelete={() => handleDelete(exam.id)}
                    onGrade={() => setGradeExamId(exam.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {gradeExamId && (
        <GradeExamDialog examId={gradeExamId} onClose={() => setGradeExamId(null)} />
      )}
    </div>
  )
}

// ── Exam Card ────────────────────────────────────────────────────────────────

function ExamCard({ exam, canManage, statusCfg, onDelete, onGrade }: {
  exam: Exam; canManage: boolean; statusCfg: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }>; onDelete: () => void; onGrade: () => void
}) {
  const t = useT()
  const cfg = statusCfg[exam.status] ?? statusCfg.upcoming
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold text-gray-900">{exam.title}</h3>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
          {exam.gradesCount > 0 && (
            <span className="text-xs text-gray-400">{exam.gradesCount} {t('exams.grades')}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-2 flex-wrap">
          {exam.groupName && <span>{exam.groupName}</span>}
          {exam.subjectName && (
            <span className="flex items-center gap-1 text-xs text-primary-600">
              <BookOpen className="w-3 h-3" />{exam.subjectName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />{formatDate(exam.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />{exam.startTime} – {exam.endTime}
          </span>
        </div>
        {exam.description && (
          <p className="text-xs text-gray-500 mt-2 italic">{exam.description}</p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        {canManage && (
          <Button size="sm" variant="secondary" onClick={onGrade}>
            {t('exams.examGrades')}
          </Button>
        )}
        {canManage && exam.status === 'upcoming' && (
          <button onClick={onDelete} className="p-1.5 rounded text-gray-300 hover:text-danger-500">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Create Form ──────────────────────────────────────────────────────────────

function ExamForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT()
  const [form, setForm] = useState({
    title: '', groupId: '', subjectId: '', date: '', startTime: '10:00', endTime: '12:00', description: '', maxScore: '10',
  })
  const { data: groups = [] } = useGroups()
  const { data: subjects = [] } = useSubjects()
  const { mutate, isPending } = useCreateExam()

  const set = (f: string) => (e: React.ChangeEvent<any>) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.groupId || !form.date) return
    mutate({
      title: form.title.trim(), groupId: form.groupId,
      subjectId: form.subjectId || undefined,
      date: form.date, startTime: form.startTime, endTime: form.endTime,
      description: form.description.trim() || undefined,
      maxScore: Number(form.maxScore) || 10,
    }, {
      onSuccess: () => {
        toast.success(t('exams.created'))
        setForm({ title: '', groupId: '', subjectId: '', date: '', startTime: '10:00', endTime: '12:00', description: '', maxScore: '10' })
        onOpenChange(false)
      },
      onError: () => toast.error(t('exams.createError')),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('exams.newExam')}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.nameRequired')}</label>
                <Input value={form.title} onChange={set('title')} placeholder={t('exams.namePlaceholder')} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.groupRequired')}</label>
                  <select value={form.groupId} onChange={set('groupId')} required
                    className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white">
                    <option value="">{t('exams.select')}</option>
                    {(groups as any[]).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.subject')}</label>
                  <select value={form.subjectId} onChange={set('subjectId')}
                    className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm focus:outline-none focus:border-primary-500 bg-white">
                    <option value="">{t('exams.auto')}</option>
                    {(subjects as any[]).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.dateRequired')}</label>
                  <DatePicker value={form.date} onChange={(v) => set('date')({ target: { value: v } } as any)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.start')}</label>
                  <Input type="time" value={form.startTime} onChange={set('startTime')} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.end')}</label>
                  <Input type="time" value={form.endTime} onChange={set('endTime')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('exams.maxScore')}</label>
                <Input type="number" value={form.maxScore} onChange={set('maxScore')} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('common.description')}</label>
                <textarea value={form.description} onChange={set('description')} rows={2} placeholder={t('exams.topics')}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-primary-500" />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={isPending} disabled={!form.title || !form.groupId || !form.date}>{t('common.create')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Grade Exam Dialog ────────────────────────────────────────────────────────

function GradeExamDialog({ examId, onClose }: { examId: string; onClose: () => void }) {
  const t = useT()
  const qc = useQueryClient()
  const { data: exam } = useQuery({
    queryKey: ['lms', 'exams', examId],
    queryFn: () => apiClient.get(`/lms/exams/${examId}`).then((r) => r.data),
    enabled: !!examId,
  })
  const { data: students = [] } = useQuery({
    queryKey: ['lms', 'exams', examId, 'students'],
    queryFn: () => apiClient.get(`/lms/exams/${examId}/students`).then((r) => r.data as any[]),
    enabled: !!examId,
  })
  const { data: existingGrades = [] } = useQuery({
    queryKey: ['lms', 'exams', examId, 'grades'],
    queryFn: () => apiClient.get(`/lms/exams/${examId}/grades`).then((r) => r.data as any[]),
    enabled: !!examId,
  })

  const [grades, setGrades] = useState<Record<string, { score: string; comment: string }>>({})
  const [initialized, setInitialized] = useState(false)

  // Init from existing grades
  if (!initialized && existingGrades.length > 0) {
    const init: typeof grades = {}
    for (const g of existingGrades as any[]) {
      init[g.studentId] = { score: String(g.score), comment: g.comment ?? '' }
    }
    setGrades(init)
    setInitialized(true)
  }

  const saveGrades = useMutation({
    mutationFn: (data: any[]) => apiClient.post(`/lms/exams/${examId}/grades`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'exams'] })
      qc.invalidateQueries({ queryKey: ['lms', 'exams', examId, 'grades'] })
      toast.success(t('exams.gradesSaved'))
      onClose()
    },
    onError: () => toast.error(t('exams.gradesSaveError')),
  })

  const handleSave = () => {
    const data = Object.entries(grades)
      .filter(([, v]) => v.score)
      .map(([studentId, v]) => ({
        studentId, score: Number(v.score), comment: v.comment || undefined,
      }))
    saveGrades.mutate(data)
  }

  const maxScore = (exam as any)?.maxScore ?? 10

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('exams.gradesFor')}: {(exam as any)?.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {students.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">{t('exams.noStudents')}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="flex items-center gap-3 px-2 text-xs font-medium text-gray-400">
                <span className="flex-1">{t('exams.student')}</span>
                <span className="w-20 text-center">{t('exams.score')} (/{maxScore})</span>
                <span className="w-32">{t('exams.comment')}</span>
              </div>
              {students.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 px-2">
                  <span className="flex-1 text-sm text-gray-900 truncate">{s.fullName}</span>
                  <Input
                    type="number"
                    className="w-20 h-8 text-center text-sm"
                    value={grades[s.id]?.score ?? ''}
                    onChange={(e) => setGrades((p) => ({ ...p, [s.id]: { ...p[s.id], score: e.target.value, comment: p[s.id]?.comment ?? '' } }))}
                    max={maxScore} min={0}
                  />
                  <Input
                    className="w-32 h-8 text-sm"
                    placeholder={t('exams.comment')}
                    value={grades[s.id]?.comment ?? ''}
                    onChange={(e) => setGrades((p) => ({ ...p, [s.id]: { ...p[s.id], score: p[s.id]?.score ?? '', comment: e.target.value } }))}
                  />
                </div>
              ))}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} loading={saveGrades.isPending}>
            <Check className="w-4 h-4" />
            {t('exams.saveGrades')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
