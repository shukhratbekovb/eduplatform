'use client'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useT } from '@/lib/i18n'

export default function MaterialsPage() {
  const t = useT()
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary-600" />
        {t('placeholder.materials')}
      </h1>
      <EmptyState icon={FileText} title={t('placeholder.inDevelopment')} description={t('placeholder.availableSoon')} />
    </div>
  )
}
