'use client'

/**
 * Боковая навигационная панель (Sidebar) LMS.
 *
 * Отображает меню навигации с ролевым разграничением:
 * - Основные пункты (расписание, студенты, группы и т.д.) видны всем
 * - Раздел управления (МУП) виден директору и МУП
 * - Раздел кассы виден только кассиру
 * - Раздел директора (персонал, финансы, настройки) виден только директору
 *
 * Поддерживает свёрнутый режим (collapsed) с тултипами на иконках.
 *
 * @module LmsSidebar
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays, Users, BookOpen, ClipboardList, BarChart2,
  Settings, CheckSquare, GraduationCap, Clock, Banknote,
  UserCheck, FileText, FileCheck, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n'
import { useIsDirector, useIsDirectorOrMup, useIsTeacher, useIsCashier } from '@/lib/stores/useAuthStore'
import { usePendingLateRequestsCount } from '@/lib/hooks/lms/useLateRequests'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useState } from 'react'

// ── Структура навигации ──────────────────────────────────────────────────────

type NavItem = {
  href: string
  labelKey: string
  icon: React.ElementType
  badge?: boolean
  roleCheck?: 'teacher' | 'dirOrMup' | 'director'
}

const mainNav: NavItem[] = [
  { href: '/dashboard',   labelKey: 'nav.dashboard',   icon: LayoutDashboard },
  { href: '/schedule',    labelKey: 'nav.schedule',     icon: CalendarDays },
  { href: '/attendance',  labelKey: 'nav.attendance',   icon: UserCheck },
  { href: '/students',    labelKey: 'nav.students',     icon: Users },
  { href: '/groups',      labelKey: 'nav.groups',       icon: BookOpen },
  { href: '/homework',    labelKey: 'nav.homework',     icon: ClipboardList },
  { href: '/materials',   labelKey: 'nav.materials',    icon: FileText },
]

const reportsNav: NavItem[] = [
  { href: '/reports',     labelKey: 'nav.reports',      icon: BarChart2 },
  { href: '/exams',       labelKey: 'nav.exams',        icon: GraduationCap },
  { href: '/works',       labelKey: 'nav.works',        icon: FileCheck },
]

const mupNav: NavItem[] = [
  { href: '/late-requests', labelKey: 'nav.lateRequests', icon: Clock, badge: true },
  { href: '/tasks',         labelKey: 'nav.tasks',        icon: CheckSquare },
  { href: '/analytics',     labelKey: 'nav.analytics',    icon: BarChart2 },
]

const directorNav: NavItem[] = [
  { href: '/staff',        labelKey: 'nav.staff',         icon: Users },
  { href: '/finance',      labelKey: 'nav.finance',       icon: Banknote },
  { href: '/compensation', labelKey: 'nav.compensation',  icon: Banknote },
  { href: '/settings',     labelKey: 'nav.settings',      icon: Settings },
]

// ── Обёртка тултипа ─────────────────────────────────────────────────────────

/**
 * Обёртка Radix Tooltip для элементов навигации в свёрнутом режиме.
 * Показывает название пункта меню при наведении на иконку.
 *
 * @param label - текст тултипа
 * @param children - элемент, к которому привязан тултип
 */
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

// ── Элемент навигации ────────────────────────────────────────────────────────

/**
 * Отдельный пункт меню навигации.
 * Подсвечивает активный маршрут, показывает badge (значок с числом)
 * для запросов, ожидающих обработки, и тултип в свёрнутом режиме.
 *
 * @param href - путь маршрута
 * @param label - отображаемое название
 * @param icon - иконка Lucide
 * @param collapsed - свёрнут ли sidebar
 * @param badgeCount - число для отображения в badge (например, кол-во запросов)
 */
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

// ── Основной компонент sidebar ───────────────────────────────────────────────

/**
 * Боковая панель навигации LMS.
 *
 * Собирает секции навигации в зависимости от роли текущего пользователя.
 * Загружает количество ожидающих запросов на позднее внесение для badge.
 *
 * @param collapsed - свёрнут ли sidebar (ширина 60px vs 220px)
 * @param onToggle - обработчик переключения свёрнутого режима
 */
export function LmsSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const t = useT()
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
              label={t(item.labelKey)}
              icon={item.icon}
              collapsed={collapsed}
            />
          </div>
        ))}

        {/* Reports section */}
        <SectionLabel label={t('nav.reports')} collapsed={collapsed} />
        {reportsNav.map((item) => (
          <div key={item.href} className="mb-0.5">
            <NavItem
              href={item.href}
              label={t(item.labelKey)}
              icon={item.icon}
              collapsed={collapsed}
            />
          </div>
        ))}

        {/* MUP section */}
        {isDirOrMup && (
          <>
            <SectionLabel label={t('nav.management')} collapsed={collapsed} />
            {mupNav.map((item) => (
              <div key={item.href} className="mb-0.5">
                <NavItem
                  href={item.href}
                  label={t(item.labelKey)}
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
            <SectionLabel label={t('nav.cashDesk')} collapsed={collapsed} />
            <div className="mb-0.5">
              <NavItem href="/finance" label={t('nav.finance')} icon={Banknote} collapsed={collapsed} />
            </div>
          </>
        )}

        {/* Director section */}
        {isDirector && (
          <>
            <SectionLabel label={t('role.director')} collapsed={collapsed} />
            {directorNav.map((item) => (
              <div key={item.href} className="mb-0.5">
                <NavItem
                  href={item.href}
                  label={t(item.labelKey)}
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
