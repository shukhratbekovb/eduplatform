'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, CheckSquare, BarChart2, Settings,
  ChevronLeft, ChevronRight, GraduationCap, BookUser, LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCrmStore } from '@/lib/stores/useCrmStore'
import { useIsDirector } from '@/lib/stores/useAuthStore'
import { useT } from '@/lib/i18n'
import * as Tooltip from '@radix-ui/react-tooltip'

const navItemDefs = [
  { href: '/dashboard', i18nKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/leads',     i18nKey: 'nav.leads',     icon: Users },
  { href: '/contacts',  i18nKey: 'nav.contacts',  icon: BookUser },
  { href: '/tasks',     i18nKey: 'nav.tasks',     icon: CheckSquare },
  { href: '/analytics', i18nKey: 'nav.analytics', icon: BarChart2 },
]

const settingsItemDef = { href: '/settings', i18nKey: 'nav.settings', icon: Settings }

function NavItem({
  href, label, icon: Icon, collapsed,
}: {
  href: string; label: string; icon: React.ElementType; collapsed: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname?.startsWith(href) ?? false

  const inner = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors w-full',
        isActive
          ? 'bg-sidebar-active text-sidebar-text-active'
          : 'text-sidebar-text hover:bg-sidebar-hover',
        collapsed && 'justify-center px-2'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-sidebar-icon')} />
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>{inner}</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="right"
              className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md z-50"
            >
              {label}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    )
  }

  return inner
}

export function CrmSidebar() {
  const t           = useT()
  const collapsed   = useCrmStore((s) => s.sidebarCollapsed)
  const toggle      = useCrmStore((s) => s.toggleSidebar)
  const isDirector  = useIsDirector()

  const navItems    = navItemDefs.map(({ i18nKey, ...d }) => ({ ...d, label: t(i18nKey) }))
  const settingsItem = (({ i18nKey, ...d }) => ({ ...d, label: t(i18nKey) }))(settingsItemDef)

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar-bg min-h-screen shrink-0 transition-all duration-300',
        collapsed ? 'w-sidebar-sm' : 'w-sidebar'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/10',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white leading-none">EduPlatform</p>
            <p className="text-xs text-sidebar-text mt-0.5">CRM</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}

        {isDirector && (
          <>
            <div className="my-3 border-t border-white/10" />
            <NavItem {...settingsItem} collapsed={collapsed} />
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4">
        <button
          onClick={toggle}
          className={cn(
            'flex items-center justify-center w-full h-9 rounded-md',
            'text-sidebar-text hover:bg-sidebar-hover transition-colors',
            collapsed && 'w-9 mx-auto'
          )}
          aria-label={collapsed ? t('nav.sidebarShow') : t('nav.sidebarHide')}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span className="text-xs ml-2">{t('nav.collapse')}</span></>
          }
        </button>
      </div>
    </aside>
  )
}
