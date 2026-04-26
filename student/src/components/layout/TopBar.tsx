'use client'
import { Bell, Star, Gem } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { useDashboard } from '@/lib/hooks/student'
import { ProfileDropdown } from './ProfileDropdown'

export function TopBar() {
  const t = useT()
  const { data } = useDashboard()

  const stars = data?.stars ?? 0
  const crystals = data?.crystals ?? 0

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-5 gap-3 shrink-0">
      {/* Stars */}
      <div className="flex items-center gap-1.5 bg-warning-50 text-warning-700 rounded-full px-3 py-1">
        <Star className="w-3.5 h-3.5 fill-warning-500 text-warning-500" />
        <span className="text-xs font-semibold">{stars.toLocaleString()}</span>
      </div>

      {/* Crystals */}
      <div className="flex items-center gap-1.5 bg-info-50 text-info-600 rounded-full px-3 py-1">
        <Gem className="w-3.5 h-3.5 text-info-500" />
        <span className="text-xs font-semibold">{crystals.toLocaleString()}</span>
      </div>

      {/* Notifications */}
      <button
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 relative transition-colors"
        aria-label={t('topbar.notifications')}
      >
        <Bell className="w-4.5 h-4.5" />
      </button>

      {/* Profile */}
      <ProfileDropdown />
    </header>
  )
}
