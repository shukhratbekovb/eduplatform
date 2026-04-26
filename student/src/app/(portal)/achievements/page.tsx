'use client'
import { useT } from '@/lib/i18n'
import { useAchievementCatalog } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { Star, Lock, Gem } from 'lucide-react'

const CATEGORY_ORDER = ['academic', 'attendance', 'activity', 'social', 'special']

export default function AchievementsPage() {
  const t = useT()
  const { data: achievements = [], isLoading } = useAchievementCatalog()

  const unlocked = achievements.filter((a: any) => a.is_unlocked)

  const grouped = CATEGORY_ORDER.reduce<Record<string, any[]>>((acc, cat) => {
    const items = achievements.filter((a: any) => a.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('achievements.title')}</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {t('achievements.unlocked')}: <span className="font-bold text-gray-800">{unlocked.length}/{achievements.length}</span>
          </span>
          <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${achievements.length ? (unlocked.length / achievements.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-36 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {t(`achievements.category.${cat}`)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((a: any) => (
                  <div key={a.id} className={cn(
                    'bg-white rounded-xl border p-4 flex flex-col items-center gap-2 text-center transition-all',
                    a.is_unlocked ? 'border-success-200 shadow-sm' : 'border-gray-100 opacity-60 grayscale'
                  )}>
                    <div className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center text-2xl relative',
                      a.is_unlocked ? 'bg-warning-50' : 'bg-gray-100'
                    )}>
                      <span>{a.icon}</span>
                      {!a.is_unlocked && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-gray-200/60">
                          <Lock className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{a.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">{a.description}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                      {a.reward_stars > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-medium text-warning-600">
                          <Star className="w-3 h-3 fill-warning-400 text-warning-400" />
                          +{a.reward_stars}
                        </span>
                      )}
                      {a.reward_crystals > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-medium text-cyan-600">
                          <Gem className="w-3 h-3" />
                          +{a.reward_crystals}
                        </span>
                      )}
                    </div>
                    {a.is_unlocked && a.unlocked_at && (
                      <p className="text-xs text-success-500">{a.unlocked_at.slice(0, 10)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
