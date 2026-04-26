'use client'
import { useState, useRef } from 'react'
import { Search, ChevronDown, X, Clock, FileText, Download, Upload, Paperclip } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { format, parseISO } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { useSubmitAssignment } from '@/lib/hooks/student'
import { formatDate, daysUntil } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Assignment, AssignmentType } from '@/types/student'

type Tab = 'pending' | 'submitted' | 'reviewed'

const TYPE_COLORS: Record<string, string> = {
  homework:      'bg-success-500',
  participation: 'bg-primary-500',
  exam:          'bg-danger-500',
  quiz:          'bg-warning-500',
  project:       'bg-info-500',
  class:         'bg-primary-500',
  independent:   'bg-warning-500',
  control:       'bg-danger-500',
  thematic:      'bg-info-500',
}

const STATUS_BADGE: Record<string, 'danger' | 'warning' | 'success' | 'default'> = {
  overdue:   'danger',
  pending:   'warning',
  submitted: 'default',
  reviewed:  'success',
}

export default function HomeworkPage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)

  const [tab,    setTab]    = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssignmentType | ''>('')
  const [selected, setSelected] = useState<Assignment | null>(null)
  const [text, setText]    = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // "pending" tab shows both pending + overdue (student must still do them)
  const { data: allForTab = [], isLoading } = useQuery({
    queryKey: ['student', 'assignments', tab],
    queryFn: async () => {
      if (tab === 'pending') {
        const res = await apiClient.get('/student/assignments')
        return (res.data as any[]).filter((a: any) => a.status === 'pending' || a.status === 'overdue')
      }
      const res = await apiClient.get('/student/assignments', { params: { status: tab } })
      return res.data as any[]
    },
    staleTime: 5 * 60_000,
  })
  const assignments = allForTab
  const { mutate: submit, isPending: submitting } = useSubmitAssignment()

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase()
    const matchQ = !q || a.title.toLowerCase().includes(q) || a.subjectName.toLowerCase().includes(q)
    const matchT = !typeFilter || a.type === typeFilter
    return matchQ && matchT
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'homework')
      const res = await apiClient.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadedFileUrl(res.data.url)
      setUploadedFileName(res.data.filename)
      toast.success(t('homework.fileUploaded'))
    } catch {
      toast.error(t('homework.fileUploadError'))
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSubmit = () => {
    if (!selected) return
    if (!text.trim() && !uploadedFileUrl) return
    submit(
      { id: selected.id, data: { text: text.trim() || undefined, fileUrl: uploadedFileUrl || undefined } },
      {
        onSuccess: () => {
          toast.success(t('homework.submitBtn') + ' ✓')
          setSelected(null)
          setText('')
          setUploadedFileUrl(null)
          setUploadedFileName(null)
        },
        onError: () => toast.error(t('homework.submitError')),
      }
    )
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pending',   label: t('homework.tab.pending'),   count: assignments.filter((a) => tab === 'pending').length },
    { key: 'submitted', label: t('homework.tab.submitted'), count: 0 },
    { key: 'reviewed',  label: t('homework.tab.reviewed'),  count: 0 },
  ]

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-bold text-gray-900">{t('homework.title')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelected(null) }}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search') + '…'}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AssignmentType | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('homework.filterType')}</option>
          {(['homework', 'participation', 'exam', 'quiz', 'project'] as AssignmentType[]).map((type) => (
            <option key={type} value={type}>{t(`assignment.type.${type}`)}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{t('homework.total')}: {filtered.length}</span>
      </div>

      {/* Content */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Grid */}
        <div className={cn('flex-1 overflow-auto', selected && 'lg:max-w-[55%]')}>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-32 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <FileText className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{t('homework.empty')}</p>
            </div>
          ) : (
            // Group by month
            <div className="space-y-5">
              {groupByMonth(filtered, lang, t).map(({ month, items }) => (
                <div key={month}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{month}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {items.map((a) => (
                      <AssignmentCard
                        key={a.id}
                        assignment={a}
                        selected={selected?.id === a.id}
                        onClick={() => setSelected(selected?.id === a.id ? null : a)}
                        t={t}
                        lang={lang}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-4 overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400">{formatDate(selected.lessonDate, lang)} · {selected.subjectName}</p>
                <h3 className="text-sm font-bold text-gray-900 mt-0.5">{selected.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selected.teacherName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            {selected.description && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">{t('homework.description')}</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</p>
              </div>
            )}

            {/* Assignment files (from teacher) */}
            {selected.assignmentFiles && selected.assignmentFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1.5">{t('homework.taskFiles')}</p>
                <div className="space-y-1.5">
                  {selected.assignmentFiles.map((f, i) => (
                    <button key={i}
                      onClick={async () => {
                        const res = await apiClient.get('/files/download', {
                          params: { key: (f as any).key || '', filename: f.filename },
                          responseType: 'blob',
                        })
                        const url = URL.createObjectURL(res.data)
                        const a = document.createElement('a'); a.href = url; a.download = f.filename; a.click()
                        URL.revokeObjectURL(url)
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-700 hover:bg-primary-100 transition-colors w-full text-left">
                      <Download className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">{f.filename}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Deadline */}
            <DeadlineBanner deadline={selected.deadline} status={selected.status} t={t} />

            {/* Reviewed: show grade + feedback */}
            {selected.status === 'reviewed' && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between bg-success-50 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium text-success-700">{t('homework.grade')}</span>
                  <span className="text-xl font-bold text-success-700">{selected.grade}/10</span>
                </div>
                {selected.teacherComment && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 mb-0.5">{t('homework.teacherComment')}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.teacherComment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submitted: show what student sent */}
            {selected.status === 'submitted' && (
              <div className="mt-3 space-y-2">
                <div className="bg-blue-50 rounded-lg px-3 py-2">
                  <p className="text-xs font-medium text-blue-600 mb-0.5">{t('homework.answerSubmitted')}</p>
                  <p className="text-xs text-blue-500">{t('homework.awaitingReview')}</p>
                </div>
                {selected.submittedText && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">{t('homework.yourText')}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.submittedText}</p>
                  </div>
                )}
                {selected.submittedFileUrl && (
                  <a href={selected.submittedFileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-primary-600 hover:bg-gray-100 transition-colors">
                    <Paperclip className="w-4 h-4 shrink-0" />
                    <span>{t('homework.yourFile')}</span>
                  </a>
                )}
              </div>
            )}

            {/* Submit area (pending / overdue) */}
            {(selected.status === 'pending' || selected.status === 'overdue') && (
              <div className="mt-3 space-y-3">
                <p className="text-xs font-medium text-gray-700">{t('homework.submitArea')}</p>

                {/* File upload */}
                <div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                  {uploadedFileName ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-success-50 border border-success-200 rounded-lg text-sm">
                      <Paperclip className="w-4 h-4 text-success-600 shrink-0" />
                      <span className="text-success-700 truncate flex-1">{uploadedFileName}</span>
                      <button onClick={() => { setUploadedFileUrl(null); setUploadedFileName(null) }}
                        className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                      className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50">
                      <Upload className="w-4 h-4" />
                      {uploadingFile
                        ? t('homework.uploading')
                        : t('homework.attachFile')}
                    </button>
                  )}
                </div>

                {/* Text answer */}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t('homework.textAnswer')}
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
                />
                <Button className="w-full" onClick={handleSubmit} loading={submitting}
                  disabled={!text.trim() && !uploadedFileUrl}>
                  {t('homework.submitBtn')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AssignmentCard({ assignment: a, selected, onClick, t, lang }: {
  assignment: Assignment; selected: boolean; onClick: () => void
  t: (k: string) => string; lang: string
}) {
  const days = daysUntil(a.deadline)
  const isOverdue = a.status === 'overdue' || days < 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm',
        selected ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', TYPE_COLORS[a.type])}>
          {a.type[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 truncate">{t(`assignment.type.${a.type}`)}</p>
          <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 mt-0.5">{a.title}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 truncate mb-2">{formatDate(a.lessonDate, lang)}</p>

      {a.status === 'reviewed' && a.grade !== null ? (
        <Badge variant="success">{a.grade}</Badge>
      ) : isOverdue ? (
        <Badge variant="danger">{t('homework.overdue')}</Badge>
      ) : days <= 3 ? (
        <Badge variant="warning">{t('homework.daysLeft')} {days} {t('common.days')}</Badge>
      ) : (
        <Badge variant="default">{t('homework.daysLeft')} {days} {t('common.days')}</Badge>
      )}
    </div>
  )
}

function DeadlineBanner({ deadline, status, t }: { deadline: string; status: string; t: (k: string) => string }) {
  const days = daysUntil(deadline)
  const isOverdue = status === 'overdue' || days < 0
  return (
    <div className={cn(
      'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium',
      isOverdue ? 'bg-danger-50 text-danger-700' : 'bg-gray-50 text-gray-700'
    )}>
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4" />
        <span>{t('homework.deadline')}: {deadline}</span>
      </div>
      {!isOverdue && <span className="text-xs font-semibold">{days} {t('common.days')}</span>}
    </div>
  )
}

function groupByMonth(assignments: Assignment[], lang: string, _t: (k: string) => string) {
  const locale = lang === 'ru' ? ru : enUS
  const groups: Record<string, Assignment[]> = {}
  for (const a of assignments) {
    if (!a.lessonDate) continue
    const month = format(parseISO(a.lessonDate), 'LLLL', { locale })
    if (!groups[month]) groups[month] = []
    groups[month].push(a)
  }
  return Object.entries(groups).map(([month, items]) => ({ month, items }))
}
