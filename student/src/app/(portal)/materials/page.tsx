'use client'
import { useState } from 'react'
import { Search, FileText, Video, BookOpen, Presentation, ExternalLink } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useMaterials, useSubjects } from '@/lib/hooks/student'
import { useI18nStore } from '@/lib/stores/useI18nStore'
import { cn } from '@/lib/utils/cn'
import { formatShortDate } from '@/lib/utils/dates'
import type { Material, MaterialType, MaterialLanguage } from '@/types/student'

const TYPE_ICONS: Record<MaterialType, React.ElementType> = {
  pdf:          FileText,
  video:        Video,
  article:      BookOpen,
  presentation: FileText,
}
const TYPE_COLORS: Record<MaterialType, string> = {
  pdf:          'bg-danger-50 text-danger-600',
  video:        'bg-primary-50 text-primary-600',
  article:      'bg-success-50 text-success-600',
  presentation: 'bg-warning-50 text-warning-600',
}

export default function MaterialsPage() {
  const t    = useT()
  const lang = useI18nStore((s) => s.lang)

  const [search,    setSearch]    = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [language,  setLanguage]  = useState<MaterialLanguage | ''>('')

  const { data: subjects = [] } = useSubjects()
  const { data: materials = [], isLoading } = useMaterials({
    subjectId: subjectId || undefined,
    language:  language  || undefined,
  })

  const filtered = materials.filter((m) => {
    const q = search.toLowerCase()
    return !q || m.title.toLowerCase().includes(q) || m.subjectName.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('materials.title')}</h1>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('materials.search') + '…'}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
          />
        </div>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('materials.subject')}</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as MaterialLanguage | '')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="">{t('materials.language')}</option>
          <option value="ru">{t('materials.lang.ru')}</option>
          <option value="en">{t('materials.lang.en')}</option>
          <option value="uz">{t('materials.lang.uz')}</option>
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-gray-400">
          <Search className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">{t('materials.empty')}</p>
          <p className="text-xs mt-1">{t('materials.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => <MaterialCard key={m.id} material={m} t={t} lang={lang} />)}
        </div>
      )}
    </div>
  )
}

function MaterialCard({ material: m, t, lang }: { material: Material; t: (k: string) => string; lang: string }) {
  const Icon = TYPE_ICONS[m.type]
  const colorClass = TYPE_COLORS[m.type]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{m.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{m.subjectName}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{t(`materials.type.${m.type}`)}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">{m.language}</span>
        </div>
        <a href={m.url} className="flex items-center gap-1 text-xs text-primary-600 hover:underline font-medium">
          <ExternalLink className="w-3 h-3" />
          {t('materials.open')}
        </a>
      </div>
      <p className="text-xs text-gray-300">{formatShortDate(m.uploadedAt, lang)}</p>
    </div>
  )
}
