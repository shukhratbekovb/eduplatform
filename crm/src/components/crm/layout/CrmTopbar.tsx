'use client'
import { Bell, LogOut, Sun, Moon, Languages } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useAuthStore } from '@/lib/stores/useAuthStore'
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

// ── Notification Bell ──────────────────────────────────────────────────────────
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

// ── User Menu ──────────────────────────────────────────────────────────────────
function UserMenu() {
  const t      = useT()
  const user   = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!user) return null

  const roleLabel = user.role === 'director' ? t('role.director') : t('role.sales_manager')

  return (
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
            onSelect={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 cursor-pointer outline-none"
          >
            <LogOut className="w-4 h-4" />
            {t('topbar.logout')}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────────
interface CrmTopbarProps {
  title?: string
}

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
