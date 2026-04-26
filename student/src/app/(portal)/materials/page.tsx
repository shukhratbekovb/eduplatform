'use client'
import { useState } from 'react'
import {
  Search, FileText, Video, BookOpen, ExternalLink, Download,
  ChevronDown, ChevronUp, Calendar, UserCheck, Paperclip,
} from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useLessonsMaterials } from '@/lib/hooks/student'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { apiClient } from '@/lib/api/axios'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/dates'

const TYPE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText, video: Video, link: ExternalLink, image: FileText,
  article: BookOpen, presentation: FileText, other: FileText,
}
const TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-danger-50 text-danger-600', video: 'bg-primary-50 text-primary-600',
  link: 'bg-blue-50 text-blue-600', image: 'bg-amber-50 text-amber-600',
  article: 'bg-success-50 text-success-600', presentation: 'bg-warning-50 text-warning-600',
  other: 'bg-gray-50 text-gray-600',
}

async function downloadFile(key: string, filename: string) {
  const res = await apiClient.get('/files/download', {
    params: { key, filename },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function MaterialsPage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: lessons = [], isLoading } = useLessonsMaterials()

  const filtered = lessons.filter((l: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (l.topic ?? '').toLowerCase().includes(q) ||
      l.subjectName.toLowerCase().includes(q) ||
      l.materials.some((m: any) => m.title.toLowerCase().includes(q))
    )
  })

  const totalMaterials = filtered.reduce((s: number, l: any) => s + l.materialsCount, 0)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('materials.title')}</h1>

      {/* Search + stats */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('materials.search') + '…'}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
        </div>
        <div className="text-xs text-gray-400 shrink-0">
          {filtered.length} {t('materials.lessons')} · {totalMaterials} {t('materials.files')}
        </div>
      </div>

      {/* Lessons list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-gray-400">
          <BookOpen className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">{t('materials.empty')}</p>
          <p className="text-xs mt-1">{t('materials.emptyHint')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lesson: any) => {
            const isOpen = expanded === lesson.id
            return (
              <div key={lesson.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Lesson header */}
                <button
                  onClick={() => setExpanded(isOpen ? null : lesson.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {lesson.topic || lesson.subjectName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(lesson.date, lang)}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        {lesson.teacherName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {lesson.materialsCount}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-primary-600 font-medium px-2 py-1 bg-primary-50 rounded">
                      {lesson.subjectName}
                    </span>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Materials list */}
                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    <div className="space-y-2">
                      {lesson.materials.map((m: any) => {
                        const Icon = TYPE_ICONS[m.type] ?? FileText
                        const colorClass = TYPE_COLORS[m.type] ?? 'bg-gray-50 text-gray-600'
                        const hasKey = !!m.key
                        const isLink = m.type === 'link'

                        return (
                          <div key={m.id}
                            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                          >
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {t(`materials.type.${m.type}`)}
                                </span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">
                                  {m.language}
                                </span>
                              </div>
                            </div>
                            {isLink ? (
                              <a href={m.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors shrink-0">
                                <ExternalLink className="w-3.5 h-3.5" />
                                {t('common.open')}
                              </a>
                            ) : hasKey ? (
                              <button
                                onClick={() => downloadFile(m.key, m.title)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors shrink-0">
                                <Download className="w-3.5 h-3.5" />
                                {t('common.download')}
                              </button>
                            ) : (
                              <a href={m.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors shrink-0">
                                <Download className="w-3.5 h-3.5" />
                                {t('common.download')}
                              </a>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
