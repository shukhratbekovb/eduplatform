'use client'
import { useState } from 'react'
import { BookMarked, CheckCircle, Clock, XCircle, BarChart2 } from 'lucide-react'
import { useHomeworkSubmissions, useReviewHomework } from '@/lib/hooks/lms/useHomework'
import { useHomeworkByTeacher } from '@/lib/hooks/lms/useAnalytics'
import { useCurrentUser, useIsDirectorOrMup } from '@/lib/stores/useAuthStore'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import type { HomeworkSubmission } from '@/types/lms'

const STATUS_FILTERS = [
  { value: '',           label: 'Все' },
  { value: 'submitted',  label: 'На проверке' },
  { value: 'reviewed',   label: 'Проверено' },
  { value: 'overdue',    label: 'Просрочено' },
]

export default function HomeworkPage() {
  const user       = useCurrentUser()
  const isTeacher  = user?.role === 'teacher'
  const isDirOrMup = useIsDirectorOrMup()

  const [view, setView]                 = useState<'list' | 'summary'>('list')
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [reviewTarget, setReviewTarget] = useState<HomeworkSubmission | null>(null)
  const [grade, setGrade]               = useState<number>(5)
  const [feedback, setFeedback]         = useState('')

  const { data, isLoading } = useHomeworkSubmissions({ status: statusFilter || undefined })
  const submissions         = (data as any)?.data ?? []
  const total               = (data as any)?.total ?? 0

  const { data: summary = [] } = useHomeworkByTeacher()

  const { mutate: review, isPending: reviewing } = useReviewHomework()

  const openReview = (sub: HomeworkSubmission) => {
    setReviewTarget(sub)
    setGrade(5)
    setFeedback('')
  }

  const submitReview = () => {
    if (!reviewTarget) return
    review(
      { id: reviewTarget.id, data: { grade, feedback: feedback || '' } },
      {
        onSuccess: () => {
          setReviewTarget(null)
        },
      }
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary-600" />
          Домашние задания
          {view === 'list' && <span className="text-sm font-normal text-gray-400">({total})</span>}
        </h1>
        {isDirOrMup && (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
            <button
              onClick={() => setView('list')}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors', view === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700')}
            >
              Список
            </button>
            <button
              onClick={() => setView('summary')}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5', view === 'summary' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700')}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Сводка
            </button>
          </div>
        )}
      </div>

      {/* Summary view for Director/MUP */}
      {view === 'summary' && isDirOrMup && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Преподаватель</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Всего</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Проверено</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Ожидает</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Просрочено</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">% проверки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(summary as any[]).map((row: any) => (
                <tr key={row.teacherId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.teacherName}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.total}</td>
                  <td className="px-4 py-3 text-center text-success-700 font-semibold">{row.reviewed}</td>
                  <td className="px-4 py-3 text-center text-warning-700">{row.pending}</td>
                  <td className="px-4 py-3 text-center text-danger-700">{row.overdue}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'text-sm font-bold',
                      row.reviewRate >= 80 ? 'text-success-700' : row.reviewRate >= 50 ? 'text-warning-700' : 'text-danger-700'
                    )}>
                      {row.reviewRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(summary as any[]).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Нет данных</p>
          )}
        </div>
      )}

      {/* Status filter + list (list view only) */}
      {view === 'list' && (
        <>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-md mb-5 w-fit">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  statusFilter === f.value
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="Нет домашних заданий"
              description="Здесь появятся задания по вашим урокам"
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {submissions.map((sub: HomeworkSubmission) => (
                <SubmissionRow
                  key={sub.id}
                  submission={sub}
                  isTeacher={isTeacher}
                  onReview={openReview}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Review modal */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Проверить задание</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {reviewTarget && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">{(reviewTarget as any).student?.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(reviewTarget as any).homework?.title}</p>
                  {reviewTarget.fileUrl && (
                    <a
                      href={reviewTarget.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline mt-1 inline-block"
                    >
                      Открыть файл
                    </a>
                  )}
                  {reviewTarget.comment && (
                    <p className="text-sm text-gray-700 mt-2 italic">"{reviewTarget.comment}"</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Оценка (1–10)</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setGrade(n)}
                        className={cn(
                          'w-9 h-9 rounded-md text-sm font-semibold border transition-colors',
                          grade === n
                            ? n >= 8 ? 'bg-success-500 text-white border-success-500'
                              : n >= 6 ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-danger-500 text-white border-danger-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Комментарий (необязательно)</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    placeholder="Отзыв преподавателя…"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>Отмена</Button>
            <Button onClick={submitReview} disabled={reviewing}>
              {reviewing ? 'Сохранение…' : 'Сохранить оценку'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SubmissionRow({
  submission,
  isTeacher,
  onReview,
}: {
  submission: HomeworkSubmission
  isTeacher: boolean
  onReview: (s: HomeworkSubmission) => void
}) {
  const statusConfig = {
    submitted: { label: 'На проверке', variant: 'warning' as const, icon: Clock },
    reviewed:  { label: 'Проверено',   variant: 'success' as const, icon: CheckCircle },
    overdue:   { label: 'Просрочено',  variant: 'danger' as const,  icon: XCircle },
    not_submitted: { label: 'Не сдано', variant: 'default' as const, icon: XCircle },
  }
  const cfg = statusConfig[submission.status as keyof typeof statusConfig] ?? statusConfig.not_submitted

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar name={(submission as any).student?.fullName ?? '?'} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {(submission as any).student?.fullName ?? 'Студент'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {(submission as any).assignment?.title ?? 'ДЗ'} · {submission.submittedAt ? formatDate(submission.submittedAt) : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-4 shrink-0">
        {submission.grade !== null && (
          <span className="text-sm font-bold text-gray-700">{submission.grade}/10</span>
        )}
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
        {isTeacher && submission.status === 'submitted' && (
          <Button size="sm" variant="secondary" onClick={() => onReview(submission)}>
            Проверить
          </Button>
        )}
      </div>
    </div>
  )
}
