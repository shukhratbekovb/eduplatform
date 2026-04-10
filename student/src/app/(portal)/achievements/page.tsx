'use client'
import { useT } from '@/lib/i18n'
import { useAchievements } from '@/lib/hooks/student'
import { cn } from '@/lib/utils/cn'
import { Star, Lock } from 'lucide-react'
import type { Achievement } from '@/types/student'

const CATEGORY_ORDER = ['academic', 'attendance', 'activity', 'social', 'special']

export default function AchievementsPage() {
  const t = useT()
  const { data: achievements = [], isLoading } = useAchievements()

  const unlocked = achievements.filter((a) => a.unlockedAt)
  const locked   = achievements.filter((a) => !a.unlockedAt)

  const grouped = CATEGORY_ORDER.reduce<Record<string, Achievement[]>>((acc, cat) => {
    const items = achievements.filter((a) => a.category === cat)
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
          {Array.from({ length: 10 }).map((_, i) => (
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
                {items.map((a) => <AchievementCard key={a.id} achievement={a} t={t} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AchievementCard({ achievement: a, t }: { achievement: Achievement; t: (k: string) => string }) {
  const isUnlocked = !!a.unlockedAt

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 flex flex-col items-center gap-2 text-center transition-all',
      isUnlocked ? 'border-gray-200 hover:shadow-sm' : 'border-gray-100 opacity-50 grayscale'
    )}>
      <div className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center text-2xl relative',
        isUnlocked ? 'bg-warning-50' : 'bg-gray-100'
      )}>
        <span>{a.icon}</span>
        {!isUnlocked && (
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
        {a.rewardStars > 0 && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-warning-600">
            <Star className="w-3 h-3 fill-warning-400 text-warning-400" />
            +{a.rewardStars}
          </span>
        )}
        {a.rewardCrystals > 0 && (
          <span className="text-xs font-medium text-cyan-600">💎 +{a.rewardCrystals}</span>
        )}
      </div>
      {isUnlocked && a.unlockedAt && (
        <p className="text-xs text-gray-300">{a.unlockedAt.slice(0, 10)}</p>
      )}
    </div>
  )
}
