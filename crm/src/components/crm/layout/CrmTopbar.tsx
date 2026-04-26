'use client'

/**
 * Верхняя панель (Topbar) CRM-приложения.
 *
 * Содержит:
 * - Переключатель темы (светлая/тёмная)
 * - Переключатель языка (RU/EN)
 * - Колокольчик уведомлений с popup-списком (Radix Popover)
 * - Меню пользователя с профилем и сменой пароля (Radix DropdownMenu)
 *
 * @module CrmTopbar
 */

import { useState } from 'react'
import { Bell, LogOut, Sun, Moon, Languages, User, Lock, Eye, EyeOff, X, Mail, Phone, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useAuthStore } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { toast } from 'sonner'
import { useNotifications, useMarkAllNotificationsRead } from '@/lib/hooks/crm/useTasks'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatRelativeDate } from '@/lib/utils/dates'
import { useThemeStore } from '@/lib/stores/useThemeStore'
import { useI18nStore, type Lang } from '@/lib/stores/useI18nStore'
import { useT } from '@/lib/i18n'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils/cn'

// ── Колокольчик уведомлений ──────────────────────────────────────────────────

/**
 * Кнопка-колокольчик с popup-списком CRM-уведомлений.
 * Загружает уведомления через React Query и показывает счётчик непрочитанных.
 */
function NotificationBell() {
  const t = useT()
  const { data: notifications = [] } = useNotifications()
  const { mutate: markAll } = useMarkAllNotificationsRead()
  const unread = notifications.filter((n) => !n.isRead)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label={`Уведомления${unread.length > 0 ? `, ${unread.length} непрочитанных` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-white text-[10px] font-bold">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="w-80 bg-white rounded-lg shadow-md border border-gray-200 z-50 animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">{t('topbar.notifications')}</h3>
            {unread.length > 0 && (
              <button
                onClick={() => markAll()}
                className="text-xs text-primary-600 hover:underline"
              >
                {t('topbar.readAll')}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">{t('topbar.noNotifications')}</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  className={cn('px-4 py-3 flex gap-3', !n.isRead && 'bg-primary-50/40')}
                >
                  {!n.isRead && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-600 shrink-0" />
                  )}
                  <div className={cn('flex-1', n.isRead && 'ml-5')}>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(n.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Панель профиля ───────────────────────────────────────────────────────────

/**
 * Выдвижная панель профиля CRM-пользователя (slide-in справа).
 * Загружает данные профиля через GET /auth/me, позволяет сменить пароль.
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

  useState(() => {
    apiClient.get('/auth/me').then((r) => {
      setProfile(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  })

  const roleLabel = user?.role === 'director' ? t('role.director') : t('role.sales_manager')

  const handleChangePassword = async () => {
    if (pwData.new !== pwData.confirm) { toast.error('Пароли не совпадают'); return }
    if (pwData.new.length < 8) { toast.error('Минимум 8 символов'); return }
    setSaving(true)
    try {
      await apiClient.post('/auth/change-password', { old_password: pwData.old, new_password: pwData.new })
      toast.success('Пароль изменён')
      setPwData({ old: '', new: '', confirm: '' })
      setShowPw(false)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Ошибка')
    } finally { setSaving(false) }
  }

  if (!user) return null
  const p = profile || user

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Профиль</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" /></div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <UserAvatar name={p.name} src={p.avatarUrl} size="lg" />
                <h3 className="text-lg font-bold text-gray-900 mt-3">{p.name}</h3>
                <span className="text-sm text-primary-600 font-medium">{roleLabel}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-gray-50"><Mail className="w-4 h-4 text-gray-400" /></div><div><p className="text-xs text-gray-400">Email</p><p className="text-sm font-medium text-gray-900">{p.email}</p></div></div>
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-gray-50"><Phone className="w-4 h-4 text-gray-400" /></div><div><p className="text-xs text-gray-400">Телефон</p><p className="text-sm font-medium text-gray-900">{p.phone || '—'}</p></div></div>
                <div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-gray-50"><Calendar className="w-4 h-4 text-gray-400" /></div><div><p className="text-xs text-gray-400">Дата рождения</p><p className="text-sm font-medium text-gray-900">{p.dateOfBirth || '—'}</p></div></div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                {!showPw ? (
                  <button onClick={() => setShowPw(true)} className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                    <Lock className="w-4 h-4" />Сменить пароль
                  </button>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Смена пароля</h4>
                    <div className="relative">
                      <input type={showOld ? 'text' : 'password'} value={pwData.old} onChange={(e) => setPwData({ ...pwData, old: e.target.value })} placeholder="Текущий пароль" className="w-full h-10 border border-gray-300 rounded-lg px-3 pr-10 text-sm focus:outline-none focus:border-primary-500" />
                      <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-2.5 text-gray-400">{showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <div className="relative">
                      <input type={showNew ? 'text' : 'password'} value={pwData.new} onChange={(e) => setPwData({ ...pwData, new: e.target.value })} placeholder="Новый пароль" className="w-full h-10 border border-gray-300 rounded-lg px-3 pr-10 text-sm focus:outline-none focus:border-primary-500" />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-gray-400">{showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <input type="password" value={pwData.confirm} onChange={(e) => setPwData({ ...pwData, confirm: e.target.value })} placeholder="Подтвердите пароль" className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:border-primary-500" />
                    <div className="flex gap-2">
                      <button onClick={handleChangePassword} disabled={saving || !pwData.old || !pwData.new || !pwData.confirm} className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">{saving ? 'Сохранение...' : 'Сохранить'}</button>
                      <button onClick={() => { setShowPw(false); setPwData({ old: '', new: '', confirm: '' }) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Отмена</button>
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

// ── Меню пользователя ────────────────────────────────────────────────────────

/** Выпадающее меню CRM-пользователя с пунктами "Профиль" и "Выйти" */
function UserMenu() {
  const t      = useT()
  const user   = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!user) return null

  const roleLabel = user.role === 'director' ? t('role.director') : t('role.sales_manager')

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500">
            <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">{user.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{roleLabel}</p>
            </div>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="w-48 bg-white rounded-lg shadow-md border border-gray-200 py-1 z-50 animate-fade-in"
          >
            <DropdownMenu.Item
              onSelect={() => setShowProfile(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
            >
              <User className="w-4 h-4" />
              Профиль
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={handleLogout}
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

// ── Основной компонент Topbar CRM ────────────────────────────────────────────

/** Пропсы верхней панели CRM */
interface CrmTopbarProps {
  title?: string
}

/** Кнопка переключения темы (светлая/тёмная) */
function ThemeToggle() {
  const t      = useT()
  const theme  = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
      title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

/** Кнопка переключения языка (RU/EN) */
function LangToggle() {
  const lang    = useI18nStore((s) => s.lang)
  const setLang = useI18nStore((s) => s.setLang)
  const next: Lang = lang === 'ru' ? 'en' : 'ru'
  return (
    <button
      onClick={() => setLang(next)}
      className="flex items-center gap-1 p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-xs font-semibold"
      title={next === 'en' ? 'English' : 'Русский'}
    >
      <Languages className="w-4 h-4" />
      {lang.toUpperCase()}
    </button>
  )
}

/**
 * Верхняя панель CRM с заголовком, переключателями темы/языка,
 * уведомлениями и меню пользователя.
 *
 * @param title - заголовок страницы (опционально)
 */
export function CrmTopbar({ title }: CrmTopbarProps) {
  return (
    <header className="h-topbar bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        {title && <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LangToggle />
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1" />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
