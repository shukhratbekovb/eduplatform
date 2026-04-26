'use client'
import { FileCheck } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useT } from '@/lib/i18n'

export default function WorksPage() {
  const t = useT()
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <FileCheck className="w-5 h-5 text-primary-600" />
        {t('placeholder.works')}
      </h1>
      <EmptyState icon={FileCheck} title={t('placeholder.inDevelopment')} description={t('placeholder.availableSoon')} />
    </div>
  )
}
