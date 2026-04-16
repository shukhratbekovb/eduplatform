'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays, Users, BookOpen, ClipboardList, BarChart2,
  Settings, CheckSquare, GraduationCap, Clock, Banknote,
  UserCheck, FileText, FileCheck, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useIsDirector, useIsDirectorOrMup, useIsTeacher, useIsCashier } from '@/lib/stores/useAuthStore'
import { usePendingLateRequestsCount } from '@/lib/hooks/lms/useLateRequests'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useState } from 'react'

// ── Nav structure ────────────────────────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: boolean
  children?: { href: string; label: string }[]
  roleCheck?: 'teacher' | 'dirOrMup' | 'director'
}

const mainNav: NavItem[] = [
  { href: '/dashboard',   label: 'Главная',             icon: LayoutDashboard },
  { href: '/schedule',    label: 'Расписание',          icon: CalendarDays },
  { href: '/attendance',  label: 'Посещаемость',        icon: UserCheck },
  { href: '/students',    label: 'Студенты',            icon: Users },
  { href: '/groups',      label: 'Группы',              icon: BookOpen },
  { href: '/homework',    label: 'Домашние задания',    icon: ClipboardList },
  { href: '/materials',   label: 'Материалы',           icon: FileText },
]

const reportsNav: NavItem[] = [
  { href: '/reports',     label: 'Отчёты',              icon: BarChart2 },
  { href: '/exams',       label: 'Экзамены',            icon: GraduationCap },
  { href: '/works',       label: 'Работы студентов',    icon: FileCheck },
]

const mupNav: NavItem[] = [
  { href: '/late-requests', label: 'Поздние запросы', icon: Clock, badge: true },
  { href: '/tasks',         label: 'Мои задачи',      icon: CheckSquare },
  { href: '/analytics',     label: 'Аналитика',       icon: BarChart2 },
]

const directorNav: NavItem[] = [
  { href: '/staff',        label: 'Персонал',      icon: Users },
  { href: '/finance',      label: 'Финансы',       icon: Banknote },
  { href: '/compensation', label: 'Компенсации',   icon: Banknote },
  { href: '/settings',     label: 'Настройки',     icon: Settings },
]

// ── Tooltip wrapper ──────────────────────────────────────────────────────────

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            className="bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-md z-50 font-medium"
          >
            {label}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

// ── Single nav item ──────────────────────────────────────────────────────────

function NavItem({
  href, label, icon: Icon, collapsed, badgeCount,
}: {
  href: string; label: string; icon: React.ElementType
  collapsed: boolean; badgeCount?: number
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  const inner = (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 rounded-lg transition-colors w-full',
        collapsed ? 'h-10 w-10 justify-center mx-auto' : 'px-3 py-2.5',
        isActive
          ? 'bg-primary-50 text-primary-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary-600' : 'text-gray-400')} />
      {!collapsed && (
        <span className={cn('text-sm font-medium truncate flex-1', isActive ? 'text-primary-700' : 'text-gray-600')}>
          {label}
        </span>
      )}
      {!collapsed && badgeCount != null && badgeCount > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 text-white text-[10px] font-bold px-1">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
      {collapsed && badgeCount != null && badgeCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-500 text-white text-[9px] font-bold">
          {badgeCount > 9 ? '9' : badgeCount}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return <NavTooltip label={label}>{inner}</NavTooltip>
  }
  return inner
}

// ── Divider label ────────────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="my-1 border-t border-gray-100" />
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
      {label}
    </p>
  )
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

export function LmsSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const isDirector = useIsDirector()
  const isDirOrMup = useIsDirectorOrMup()
  const isTeacher  = useIsTeacher()
  const isCashier  = useIsCashier()
  const pendingLateCount = usePendingLateRequestsCount(isDirOrMup)

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r border-gray-200 min-h-screen shrink-0 transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo area */}
      <div className={cn(
        'h-[60px] flex items-center border-b border-gray-100 shrink-0',
        collapsed ? 'justify-center' : 'px-4 gap-3'
      )}>
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-gray-900 tracking-tight">EduPlatform</span>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-3', collapsed ? 'px-1.5' : 'px-2')}>
        {/* Main navigation */}
        {mainNav.map((item) => (
          <div key={item.href} className="mb-0.5">
            <NavItem
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          </div>
        ))}

        {/* Reports section */}
        <SectionLabel label="Отчёты" collapsed={collapsed} />
        {reportsNav.map((item) => (
          <div key={item.href} className="mb-0.5">
            <NavItem
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          </div>
        ))}

        {/* MUP section */}
        {isDirOrMup && (
          <>
            <SectionLabel label="Управление" collapsed={collapsed} />
            {mupNav.map((item) => (
              <div key={item.href} className="mb-0.5">
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                  badgeCount={item.badge ? pendingLateCount : undefined}
                />
              </div>
            ))}
          </>
        )}

        {/* Cashier section */}
        {isCashier && (
          <>
            <SectionLabel label="Касса" collapsed={collapsed} />
            <div className="mb-0.5">
              <NavItem href="/finance" label="Финансы" icon={Banknote} collapsed={collapsed} />
            </div>
          </>
        )}

        {/* Director section */}
        {isDirector && (
          <>
            <SectionLabel label="Директор" collapsed={collapsed} />
            {directorNav.map((item) => (
              <div key={item.href} className="mb-0.5">
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                />
              </div>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
