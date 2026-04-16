'use client'
import { useState } from 'react'
import { GraduationCap, Plus, X, Calendar, Clock, MapPin } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useGroups } from '@/lib/hooks/lms/useGroups'
import { useRooms } from '@/lib/hooks/lms/useSettings'
import { useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import type { Exam } from '@/types/lms'

// ── Hooks ─────────────────────────────────────────────────────────────────────

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'exams'] })
      toast.success('Экзамен создан')
    },
    onError: () => toast.error('Не удалось создать экзамен'),
  })
}

function useDeleteExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/lms/exams/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'exams'] })
      toast.success('Экзамен удалён')
    },
    onError: () => toast.error('Не удалось удалить экзамен'),
  })
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Exam['status'], { label: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
  upcoming:    { label: 'Предстоит',  variant: 'default' },
  in_progress: { label: 'Идёт',       variant: 'warning' },
  completed:   { label: 'Завершён',   variant: 'success' },
  cancelled:   { label: 'Отменён',    variant: 'danger' },
}

// ── Exam form modal ───────────────────────────────────────────────────────────

interface ExamFormProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

function ExamForm({ open, onOpenChange }: ExamFormProps) {
  const [form, setForm] = useState({
    title: '', groupId: '', date: '', startTime: '10:00', endTime: '12:00', roomId: '', description: '',
  })

  const { data: groups = [] } = useGroups()
  const { data: rooms = [] }  = useRooms()
  const { mutate, isPending } = useCreateExam()

  if (!open) return null

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.groupId || !form.date) return
    mutate(
      {
        title:       form.title.trim(),
        groupId:     form.groupId,
        date:        form.date,
        startTime:   form.startTime,
        endTime:     form.endTime,
        roomId:      form.roomId || null,
        description: form.description.trim() || null,
      },
      { onSuccess: () => { setForm({ title: '', groupId: '', date: '', startTime: '10:00', endTime: '12:00', roomId: '', description: '' }); onOpenChange(false) } }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Новый экзамен</h2>
          <button onClick={() => onOpenChange(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название <span className="text-danger-500">*</span></label>
            <Input value={form.title} onChange={set('title')} placeholder="Промежуточный экзамен — Алгебра" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Группа <span className="text-danger-500">*</span></label>
            <select value={form.groupId} onChange={set('groupId')} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
              <option value="">Выберите группу…</option>
              {(groups as any[]).map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата <span className="text-danger-500">*</span></label>
            <Input type="date" value={form.date} onChange={set('date')} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
              <Input type="time" value={form.startTime} onChange={set('startTime')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Конец</label>
              <Input type="time" value={form.endTime} onChange={set('endTime')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Кабинет</label>
            <select value={form.roomId} onChange={set('roomId')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary-500">
              <option value="">Без кабинета</option>
              {(rooms as any[]).map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="Темы, требования…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>Отмена</Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={!form.title || !form.groupId || !form.date}>
              Создать экзамен
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const [showForm, setShowForm] = useState(false)
  const canManage  = useIsDirectorOrMup()

  const { data: exams = [], isLoading } = useExams()
  const { mutate: deleteExam } = useDeleteExam()

  const upcoming  = (exams as Exam[]).filter((e) => e.status === 'upcoming')
  const past      = (exams as Exam[]).filter((e) => e.status !== 'upcoming')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-primary-600" />
          Экзамены
        </h1>
        {canManage && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Добавить экзамен
          </Button>
        )}
      </div>

      <ExamForm open={showForm} onOpenChange={setShowForm} />

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
      ) : (exams as Exam[]).length === 0 ? (
        <EmptyState icon={GraduationCap} title="Нет экзаменов" description="Экзамены появятся здесь после добавления" />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Предстоящие</h2>
              <div className="space-y-2">
                {upcoming.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} canManage={canManage} onDelete={() => deleteExam(exam.id)} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Прошедшие</h2>
              <div className="space-y-2">
                {past.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} canManage={canManage} onDelete={() => deleteExam(exam.id)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ExamCard({ exam, canManage, onDelete }: { exam: Exam; canManage: boolean; onDelete: () => void }) {
  const cfg = STATUS_CONFIG[exam.status]
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-semibold text-gray-900">{exam.title}</h3>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>
        <p className="text-sm text-gray-500 mb-2">{exam.group?.name}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(exam.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {exam.startTime} – {exam.endTime}
          </span>
          {exam.room && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {exam.room.name}
            </span>
          )}
        </div>
        {exam.description && (
          <p className="text-xs text-gray-500 mt-2 italic">{exam.description}</p>
        )}
      </div>
      {canManage && exam.status === 'upcoming' && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded text-gray-300 hover:text-danger-500 hover:bg-danger-50 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
