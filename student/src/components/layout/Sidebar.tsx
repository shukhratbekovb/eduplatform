'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, TrendingUp, Calendar,
  FolderOpen, Trophy, ShoppingBag, CreditCard, Phone,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { usePortalStore } from '@/lib/stores/usePortalStore'
import { useT } from '@/lib/i18n'
import * as Tooltip from '@radix-ui/react-tooltip'

const navDefs = [
  { href: '/dashboard',    i18nKey: 'nav.dashboard',   icon: LayoutDashboard },
  { href: '/homework',     i18nKey: 'nav.homework',     icon: BookOpen },
  { href: '/performance',  i18nKey: 'nav.performance',  icon: TrendingUp },
  { href: '/schedule',     i18nKey: 'nav.schedule',     icon: Calendar },
  { href: '/materials',    i18nKey: 'nav.materials',    icon: FolderOpen },
  { href: '/achievements', i18nKey: 'nav.achievements', icon: Trophy },
  { href: '/shop',         i18nKey: 'nav.shop',         icon: ShoppingBag },
  { href: '/payment',      i18nKey: 'nav.payment',      icon: CreditCard },
  { href: '/contacts',     i18nKey: 'nav.contacts',     icon: Phone },
]

function NavItem({ href, label, icon: Icon, collapsed }: { href: string; label: string; icon: React.ElementType; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = pathname?.startsWith(href) ?? false

  const inner = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full',
        isActive
          ? 'bg-sidebar-active text-white'
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
            <Tooltip.Content side="right" className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-md z-50">
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

export function Sidebar() {
  const t         = useT()
  const collapsed = usePortalStore((s) => s.sidebarCollapsed)
  const toggle    = usePortalStore((s) => s.toggleSidebar)

  const navItems = navDefs.map(({ i18nKey, ...d }) => ({ ...d, label: t(i18nKey) }))

  return (
    <aside className={cn(
      'relative flex flex-col bg-sidebar-bg min-h-screen shrink-0 transition-all duration-300',
      collapsed ? 'w-sidebar-sm' : 'w-sidebar'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-sidebar-border',
        collapsed && 'justify-center px-2'
      )}>
        <img src="/favicon.svg" alt="EduPlatform" className="w-8 h-8 rounded-lg shrink-0" />
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white leading-none">EduPlatform</p>
            <p className="text-xs text-sidebar-text mt-0.5">Student Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4">
        <button
          onClick={toggle}
          className={cn(
            'flex items-center justify-center w-full h-9 rounded-lg',
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
