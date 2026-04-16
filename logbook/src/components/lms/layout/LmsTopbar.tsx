'use client'
import { Bell, LogOut, Menu, Star, BookMarked, Globe, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCurrentUser, useAuthStore } from '@/lib/stores/useAuthStore'
import { useNotifications, useMarkAllNotificationsRead } from '@/lib/hooks/lms/useSettings'
import { UserAvatar } from '@/components/ui/avatar'
import { formatRelativeDate } from '@/lib/utils/dates'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils/cn'

const ROLE_LABELS: Record<string, string> = {
  director: 'Директор',
  mup:      'МУП',
  teacher:  'Преподаватель',
}

// ── Stats badge ───────────────────────────────────────────────────────────────

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

// ── Notification bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const { data: notifications = [] } = useNotifications()
  const { mutate: markAll }          = useMarkAllNotificationsRead()
  const unread = (notifications as any[]).filter((n) => !n.isRead)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label="Уведомления"
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
            <h3 className="text-sm font-semibold text-gray-900">Уведомления</h3>
            {unread.length > 0 && (
              <button onClick={() => markAll()} className="text-xs text-primary-600 hover:underline">
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {(notifications as any[]).length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Нет уведомлений</p>
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── User menu ─────────────────────────────────────────────────────────────────

function UserMenu() {
  const user   = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const router = useRouter()

  if (!user) return null

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none">
          <UserAvatar name={user.name} src={user.avatarUrl} size="sm" />
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-gray-900 leading-none">{user.name.split(' ')[0]}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</p>
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
            <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
          <DropdownMenu.Item
            onSelect={() => { logout(); router.push('/login') }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 cursor-pointer outline-none"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

interface LmsTopbarProps {
  collapsed: boolean
  onToggle:  () => void
  groupsCount?:   number
  studentsCount?: number
}

export function LmsTopbar({
  collapsed, onToggle,
  groupsCount = 5, studentsCount = 9,
}: LmsTopbarProps) {
  return (
    <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
          aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
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
          <span>Ташкент</span>
        </div>

        <div className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg text-gray-500 text-xs font-medium">
          <Globe className="w-3.5 h-3.5" />
          <span>Русский</span>
        </div>

        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
