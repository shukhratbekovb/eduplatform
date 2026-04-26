'use client'

/**
 * Верхняя панель (Topbar) LMS-приложения.
 *
 * Содержит:
 * - Кнопку сворачивания sidebar (гамбургер)
 * - Бренд "LOGBOOK"
 * - Статистические бейджи (группы, студенты)
 * - Переключатель языка (RU/EN)
 * - Колокольчик уведомлений с popup-списком
 * - Меню пользователя с выпадающим профилем и сменой пароля
 *
 * @module LmsTopbar
 */

import { useState } from 'react'
import Link from 'next/link'
import { Bell, LogOut, Menu, Star, BookMarked, Globe, MapPin, User, Lock, Eye, EyeOff, X, Mail, Phone, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useAuthStore } from '@/lib/stores/useAuthStore'
import { useI18nStore, type Lang } from '@/lib/stores/useI18nStore'
import { useT } from '@/lib/i18n'
import { useNotifications, useMarkAllNotificationsRead } from '@/lib/hooks/lms/useSettings'
import { UserAvatar } from '@/components/ui/avatar'
import { formatRelativeDate } from '@/lib/utils/dates'
import { apiClient } from '@/lib/api/axios'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils/cn'

/** Маппинг роли пользователя на ключ i18n для отображения */
const ROLE_KEYS: Record<string, string> = {
  director: 'role.director',
  mup:      'role.mup',
  teacher:  'role.teacher',
  cashier:  'role.cashier',
}

// ── Бейдж со статистикой ─────────────────────────────────────────────────────

/**
 * Компактный бейдж для отображения числовой статистики в topbar.
 *
 * @param icon - иконка Lucide
 * @param value - отображаемое значение (число или строка)
 * @param color - CSS-класс цвета текста
 * @param bg - CSS-класс цвета фона
 */
function StatBadge({
  icon: Icon, value, color, bg,
}: {
  icon: React.ElementType; value: number | string; color: string; bg: string
}) {
  return (
    <div className={cn('flex items-center gap-1 px-2 py-1 rounded-md', bg)}>
      <Icon className={cn('w-3.5 h-3.5', color)} />
      <span className={cn('text-xs font-bold tabular-nums', color)}>{value}</span>
    </div>
  )
}

// ── Колокольчик уведомлений ───────────────────────────────────────────────────

/**
 * Кнопка-колокольчик с popup-списком уведомлений.
 *
 * Загружает уведомления через React Query, показывает счётчик непрочитанных.
 * При клике на "Прочитать все" помечает все уведомления как прочитанные.
 */
function NotificationBell() {
  const t = useT()
  const { data: notifications = [] } = useNotifications()
  const { mutate: markAll }          = useMarkAllNotificationsRead()
  const unread = (notifications as any[]).filter((n) => !n.isRead)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label={t('topbar.notifications')}
        >
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-danger-500 text-white text-[9px] font-bold">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('topbar.notifications')}</h3>
            {unread.length > 0 && (
              <button onClick={() => markAll()} className="text-xs text-primary-600 hover:underline">
                {t('topbar.readAll')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {(notifications as any[]).length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('topbar.noNotifications')}</p>
            ) : (
              (notifications as any[]).slice(0, 20).map((n) => (
                <div key={n.id} className={cn('px-4 py-3 flex gap-3', !n.isRead && 'bg-primary-50/40')}>
                  {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-600 shrink-0" />}
                  <div className={cn('flex-1', n.isRead && 'ml-5')}>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {(notifications as any[]).length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <Link href="/notifications" className="text-xs text-primary-600 hover:underline block text-center">
                {t('topbar.allNotifications')}
              </Link>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Панель профиля ───────────────────────────────────────────────────────────

/**
 * Выдвижная панель профиля пользователя (slide-in справа).
 *
 * Загружает расширенные данные профиля через GET /auth/me.
 * Позволяет просмотреть личную информацию и сменить пароль.
 *
 * @param onClose - обработчик закрытия панели
 */
function ProfilePanel({ onClose }: { onClose: () => void }) {
  const t = useT()
  const user = useCurrentUser()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [pwData, setPwData] = useState({ old: '', new: '', confirm: '' })
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load profile on mount
  useState(() => {
    apiClient.get('/auth/me').then((r) => {
      setProfile(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  })

  const handleChangePassword = async () => {
    if (pwData.new !== pwData.confirm) {
      toast.error(t('topbar.passwordMismatch'))
      return
    }
    if (pwData.new.length < 8) {
      toast.error(t('topbar.passwordMinLength'))
      return
    }
    setSaving(true)
    try {
      await apiClient.post('/auth/change-password', {
        old_password: pwData.old,
        new_password: pwData.new,
      })
      toast.success(t('topbar.passwordChanged'))
      setPwData({ old: '', new: '', confirm: '' })
      setShowPw(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || t('topbar.passwordError'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  const p = profile || user

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{t('topbar.profile')}</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center">
                <UserAvatar name={p.name} src={p.avatarUrl} size="2xl" />
                <h3 className="text-lg font-bold text-gray-900 mt-3">{p.name}</h3>
                <span className="text-sm text-primary-600 font-medium">{t(ROLE_KEYS[p.role] ?? p.role)}</span>
              </div>

              {/* Info fields */}
              <div className="space-y-3">
                <ProfileField icon={Mail} label={t('topbar.email')} value={p.email} />
                <ProfileField icon={Phone} label={t('topbar.phone')} value={p.phone || '—'} />
                <ProfileField icon={Calendar} label={t('topbar.dob')} value={p.dateOfBirth || '—'} />
              </div>

              {/* Change password */}
              <div className="pt-4 border-t border-gray-100">
                {!showPw ? (
                  <button
                    onClick={() => setShowPw(true)}
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <Lock className="w-4 h-4" />
                    {t('topbar.changePassword')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">{t('topbar.passwordChange')}</h4>
                    <div className="relative">
                      <input
                        type={showOld ? 'text' : 'password'}
                        value={pwData.old}
                        onChange={(e) => setPwData({ ...pwData, old: e.target.value })}
                        placeholder={t('topbar.currentPassword')}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 pr-10 text-sm focus:outline-none focus:border-primary-500"
                      />
                      <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-2.5 text-gray-400">
                        {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={pwData.new}
                        onChange={(e) => setPwData({ ...pwData, new: e.target.value })}
                        placeholder={t('topbar.newPassword')}
                        className="w-full h-10 border border-gray-300 rounded-lg px-3 pr-10 text-sm focus:outline-none focus:border-primary-500"
                      />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-gray-400">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type="password"
                      value={pwData.confirm}
                      onChange={(e) => setPwData({ ...pwData, confirm: e.target.value })}
                      placeholder={t('topbar.confirmPassword')}
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangePassword}
                        disabled={saving || !pwData.old || !pwData.new || !pwData.confirm}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {saving ? t('topbar.saving') : t('common.save')}
                      </button>
                      <button
                        onClick={() => { setShowPw(false); setPwData({ old: '', new: '', confirm: '' }) }}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileField({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-50">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}

// ── Меню пользователя ────────────────────────────────────────────────────────

/**
 * Выпадающее меню пользователя (Radix DropdownMenu).
 *
 * Показывает имя и роль, содержит пункты "Профиль" и "Выйти".
 * При выборе "Профиль" открывается ProfilePanel.
 */
function UserMenu() {
  const t = useT()
  const user   = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)

  if (!user) return null

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none">
            <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-gray-900 leading-none">{user.name.split(' ')[0]}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{t(ROLE_KEYS[user.role] ?? user.role)}</p>
            </div>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-fade-in"
          >
            <div className="px-3 py-2 border-b border-gray-100 mb-1">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t(ROLE_KEYS[user.role] ?? user.role)}</p>
            </div>
            <DropdownMenu.Item
              onSelect={() => setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
            >
              <User className="w-4 h-4" />
              {t('topbar.profile')}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => { logout(); router.push('/login') }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 cursor-pointer outline-none"
            >
              <LogOut className="w-4 h-4" />
              {t('topbar.logout')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
    </>
  )
}

// ── Основной компонент Topbar ────────────────────────────────────────────────

/** Пропсы верхней панели LMS */
interface LmsTopbarProps {
  collapsed: boolean
  onToggle:  () => void
  groupsCount?:   number
  studentsCount?: number
}

/**
 * Верхняя панель LMS с навигацией, уведомлениями и профилем.
 *
 * @param collapsed - свёрнут ли sidebar
 * @param onToggle - обработчик переключения sidebar
 * @param groupsCount - количество групп для бейджа
 * @param studentsCount - количество студентов для бейджа
 */
export function LmsTopbar({
  collapsed, onToggle,
  groupsCount = 5, studentsCount = 9,
}: LmsTopbarProps) {
  const t = useT()
  const lang = useI18nStore((s) => s.lang)
  const setLang = useI18nStore((s) => s.setLang)
  return (
    <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label={collapsed ? t('topbar.expandMenu') : t('topbar.collapseMenu')}
        >
          <Menu className="w-5 h-5" />
        </button>

        <span className="text-base font-bold text-primary-600 tracking-tight hidden sm:block">
          LOGBOOK
        </span>

        {/* Stats badges */}
        <div className="hidden md:flex items-center gap-1.5 ml-2">
          <StatBadge icon={BookMarked} value={groupsCount}   color="text-success-700" bg="bg-success-50" />
          <StatBadge icon={Star}       value={studentsCount} color="text-warning-700" bg="bg-warning-50" />
        </div>
      </div>

      {/* Right: city, language, bell, avatar */}
      <div className="flex items-center gap-1">
        <div className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 text-xs font-medium">
          <MapPin className="w-3.5 h-3.5" />
          <span>{t('topbar.city')}</span>
        </div>

        <button
          onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}
          className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang.toUpperCase()}</span>
        </button>

        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
