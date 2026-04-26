'use client'
import { useState } from 'react'
import { BookMarked, CheckCircle, Clock, XCircle, BarChart2, FileText, ExternalLink, Download, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useHomeworkSubmissions, useReviewHomework } from '@/lib/hooks/lms/useHomework'
import { useHomeworkByTeacher } from '@/lib/hooks/lms/useAnalytics'
import { useCurrentUser, useIsDirectorOrMup, useIsTeacher } from '@/lib/stores/useAuthStore'
import { UserAvatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'

export default function HomeworkPage() {
  const t = useT()
  const user       = useCurrentUser()
  const isTeacher  = useIsTeacher()
  const isDirOrMup = useIsDirectorOrMup()

  const STATUS_FILTERS = [
    { value: '',           label: t('common.all') },
    { value: 'submitted',  label: t('hw.onReview') },
    { value: 'graded',     label: t('hw.reviewed') },
    { value: 'overdue',    label: t('hw.overdue') },
    { value: 'pending',    label: t('hw.notSubmitted') },
  ]

  const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'default'; icon: typeof Clock }> = {
    submitted: { label: t('hw.onReview'),     variant: 'warning', icon: Clock },
    graded:    { label: t('hw.reviewed'),      variant: 'success', icon: CheckCircle },
    overdue:   { label: t('hw.overdue'),       variant: 'danger',  icon: XCircle },
    pending:   { label: t('hw.notSubmitted'),  variant: 'default',  icon: Clock },
  }

  const [view, setView]                 = useState<'list' | 'summary' | 'students'>(isDirOrMup ? 'summary' : 'list')
  const [statusFilter, setStatusFilter] = useState<string>('submitted')
  const [reviewTarget, setReviewTarget] = useState<any | null>(null)
  const [grade, setGrade]               = useState<number>(5)
  const [feedback, setFeedback]         = useState('')

  const { data, isLoading } = useHomeworkSubmissions({
    status: statusFilter || undefined,
    teacherId: isTeacher ? user?.id : undefined,
  })
  const submissions = (data as any)?.data ?? []
  const total       = (data as any)?.total ?? 0

  const { data: summary = [] } = useHomeworkByTeacher()
  const { mutate: review, isPending: reviewing } = useReviewHomework()

  const openReview = (sub: any) => {
    setReviewTarget(sub)
    setGrade(sub.score ? Math.round(sub.score) : 5)
    setFeedback(sub.feedback ?? '')
  }

  const submitReview = () => {
    if (!reviewTarget) return
    review(
      { id: reviewTarget.id, data: { grade, feedback: feedback || '' } },
      { onSuccess: () => setReviewTarget(null) },
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-primary-600" />
          {t('hw.title')}
          {view === 'list' && <span className="text-sm font-normal text-gray-400">({total})</span>}
        </h1>
        {isDirOrMup && (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-md">
            <button onClick={() => setView('summary')}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5', view === 'summary' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500')}>
              <BarChart2 className="w-3.5 h-3.5" /> {t('hw.byTeacher')}
            </button>
            <button onClick={() => setView('students')}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5', view === 'students' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500')}>
              <Users className="w-3.5 h-3.5" /> {t('hw.byStudent')}
            </button>
            <button onClick={() => setView('list')}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors', view === 'list' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500')}>
              {t('hw.allWorks')}
            </button>
          </div>
        )}
      </div>

      {/* Summary view */}
      {view === 'summary' && isDirOrMup && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">{t('hw.teacher')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.total')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.reviewed')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.onReview')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.notSubmitted')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.overdue')}</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.reviewPct')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(summary as any[]).map((row: any) => (
                <tr key={row.teacherId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.teacherName}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{row.total}</td>
                  <td className="px-4 py-3 text-center text-success-700 font-semibold">{row.reviewed}</td>
                  <td className="px-4 py-3 text-center">
                    {row.awaitingReview > 0
                      ? <span className="font-bold text-amber-600">{row.awaitingReview}</span>
                      : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.notSubmitted}</td>
                  <td className="px-4 py-3 text-center text-danger-700">{row.overdue}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('text-sm font-bold',
                      row.reviewRate >= 80 ? 'text-success-700' : row.reviewRate >= 50 ? 'text-warning-700' : 'text-danger-700'
                    )}>{row.reviewRate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(summary as any[]).length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('common.noData')}</p>}
        </div>
      )}

      {/* Students view */}
      {view === 'students' && isDirOrMup && <StudentsSummary />}

      {/* List view */}
      {view === 'list' && (
        <>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-md mb-5 w-fit">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={cn('px-3 py-1.5 rounded text-xs font-medium transition-colors',
                  statusFilter === f.value ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                )}>{f.label}</button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <EmptyState icon={BookMarked} title={t('hw.noHomework')} description={t('hw.willAppear')} />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {submissions.map((sub: any) => {
                const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending
                return (
                  <div key={sub.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={sub.student_name ?? '?'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{sub.student_name ?? t('hw.student')}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {sub.homework_title ?? t('hw.title')} · {sub.submitted_at ? formatDate(sub.submitted_at) : '\u2014'}
                        </p>
                        {/* Indicators */}
                        <div className="flex items-center gap-2 mt-0.5">
                          {sub.is_late && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                              {t('hw.late')}
                            </span>
                          )}
                          {sub.file_url && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-600">
                              <FileText className="w-3 h-3" /> {t('hw.file')}
                            </span>
                          )}
                          {sub.answer_text && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                              <FileText className="w-3 h-3" /> {t('hw.text')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      {sub.score !== null && (
                        <span className="text-sm font-bold text-gray-700">{sub.score}/10</span>
                      )}
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {(sub.status === 'submitted' || sub.status === 'overdue') && (
                        <Button size="sm" variant="secondary" onClick={() => openReview(sub)}>{t('hw.check')}</Button>
                      )}
                      {sub.status === 'graded' && (
                        <Button size="sm" variant="ghost" onClick={() => openReview(sub)}>{t('common.open')}</Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Review / View modal */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{reviewTarget?.status === 'graded' ? t('hw.viewAssignment') : t('hw.check')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {reviewTarget && (
              <div className="space-y-4">
                {/* Student + assignment info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-900">{reviewTarget.student_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{reviewTarget.homework_title}</p>
                  {reviewTarget.submitted_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t('hw.submitted')}: {formatDate(reviewTarget.submitted_at)}
                      {reviewTarget.is_late && <span className="text-amber-600 font-medium ml-1">· {t('hw.lateSubmission')}</span>}
                    </p>
                  )}
                </div>

                {/* Student's submitted file */}
                {(reviewTarget.file_url || reviewTarget.file_key) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{t('hw.attachedFile')}</p>
                    <button
                      onClick={async () => {
                        const key = reviewTarget.file_key
                        if (!key) { window.open(reviewTarget.file_url, '_blank'); return }
                        const res = await apiClient.get('/files/download', { params: { key }, responseType: 'blob' })
                        const url = URL.createObjectURL(res.data)
                        const a = document.createElement('a'); a.href = url; a.download = key.split('/').pop() || 'file'; a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="flex items-center gap-2 px-3 py-2.5 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-700 hover:bg-primary-100 transition-colors w-full">
                      <Download className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1 text-left">{t('hw.downloadStudentFile')}</span>
                    </button>
                  </div>
                )}

                {/* Student's text answer */}
                {reviewTarget.answer_text && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{t('hw.answerText')}</p>
                    <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{reviewTarget.answer_text}</pre>
                    </div>
                  </div>
                )}

                {/* No submission */}
                {!reviewTarget.file_url && !reviewTarget.answer_text && reviewTarget.status !== 'graded' && (
                  <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-700">
                    {t('hw.notYetSubmitted')}
                  </div>
                )}

                {/* Grade selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">{t('hw.grade')}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button key={n} onClick={() => setGrade(n)}
                        className={cn(
                          'w-9 h-9 rounded-md text-sm font-semibold border transition-colors',
                          grade === n
                            ? n >= 8 ? 'bg-success-500 text-white border-success-500'
                              : n >= 6 ? 'bg-primary-600 text-white border-primary-600'
                              : 'bg-danger-500 text-white border-danger-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                        )}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('hw.comment')}</label>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                    rows={3} placeholder={t('hw.feedback')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReviewTarget(null)}>{t('common.cancel')}</Button>
            <Button onClick={submitReview} disabled={reviewing}>
              {reviewing ? t('hw.saving') : reviewTarget?.status === 'graded' ? t('hw.updateGrade') : t('hw.saveGrade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Students summary ────────────────────────────────────────────────────────

function StudentsSummary() {
  const t = useT()
  const { data = [], isLoading } = useQuery({
    queryKey: ['lms', 'homework-by-student'],
    queryFn: () => apiClient.get('/lms/analytics/homework-by-student').then((r) => r.data as any[]),
  })

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
    </div>
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">{t('hw.student')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.total')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.reviewed')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.onReview')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.notSubmitted')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.overdue')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.avgGrade')}</th>
            <th className="text-center px-4 py-3 font-medium text-gray-600">{t('hw.completionPct')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row: any) => (
            <tr key={row.studentId} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{row.studentName}</p>
                <p className="text-xs text-gray-400">{row.studentCode}</p>
              </td>
              <td className="px-4 py-3 text-center text-gray-700">{row.total}</td>
              <td className="px-4 py-3 text-center text-success-700 font-semibold">{row.graded}</td>
              <td className="px-4 py-3 text-center text-warning-700">{row.submitted}</td>
              <td className="px-4 py-3 text-center text-gray-500">{row.pending}</td>
              <td className="px-4 py-3 text-center">
                {row.overdue > 0
                  ? <Badge variant="danger">{row.overdue}</Badge>
                  : <span className="text-gray-400">0</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {row.avgScore !== null
                  ? <span className={cn('font-bold', row.avgScore >= 8 ? 'text-success-700' : row.avgScore >= 6 ? 'text-gray-700' : 'text-danger-700')}>{row.avgScore}</span>
                  : <span className="text-gray-400">{'\u2014'}</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <span className={cn('text-sm font-bold',
                  row.completionRate >= 80 ? 'text-success-700' : row.completionRate >= 50 ? 'text-warning-700' : 'text-danger-700'
                )}>{row.completionRate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="text-sm text-gray-400 text-center py-8">{t('common.noData')}</p>}
    </div>
  )
}
