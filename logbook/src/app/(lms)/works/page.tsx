import { FileCheck } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export default function WorksPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
        <FileCheck className="w-5 h-5 text-primary-600" />
        Работы студентов
      </h1>
      <EmptyState icon={FileCheck} title="Раздел в разработке" description="Этот раздел будет доступен в следующем обновлении" />
    </div>
  )
}
