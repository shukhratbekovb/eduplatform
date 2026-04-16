import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export default function MaterialsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <FileText className="w-5 h-5 text-primary-600" />
        Материалы
      </h1>
      <EmptyState icon={FileText} title="Раздел в разработке" description="Этот раздел будет доступен в следующем обновлении" />
    </div>
  )
}
