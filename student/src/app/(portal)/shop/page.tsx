'use client'
import { useT } from '@/lib/i18n'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { Star, Gem, Wrench } from 'lucide-react'

export default function ShopPage() {
  const t       = useT()
  const student = useAuthStore((s) => s.student)

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <div className="w-24 h-24 rounded-full bg-primary-50 flex items-center justify-center">
        <Wrench className="w-10 h-10 text-primary-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{t('shop.title')}</h1>
        <p className="text-sm text-gray-400 mt-2 max-w-sm">{t('shop.comingSoon')}</p>
      </div>

      {student && (
        <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-warning-400 text-warning-400" />
            <span className="text-lg font-bold text-gray-800">{student.stars.toLocaleString()}</span>
            <span className="text-sm text-gray-400">{t('shop.stars')}</span>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <span className="text-lg font-bold text-gray-800">{student.crystals.toLocaleString()}</span>
            <span className="text-sm text-gray-400">{t('shop.crystals')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
