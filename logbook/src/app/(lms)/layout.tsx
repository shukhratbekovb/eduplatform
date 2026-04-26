'use client'

/**
 * Корневой layout для LMS-приложения (Logbook).
 *
 * Оборачивает все страницы LMS в провайдеры (React Query, Sonner и т.д.),
 * проверяет аутентификацию и рендерит боковую панель + верхнюю панель.
 * Неаутентифицированные пользователи автоматически перенаправляются на /login.
 *
 * @module LmsLayout
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Providers } from '@/components/shared/Providers'
import { LmsSidebar } from '@/components/lms/layout/LmsSidebar'
import { LmsTopbar } from '@/components/lms/layout/LmsTopbar'
import { useIsAuthenticated, useHasHydrated } from '@/lib/stores/useAuthStore'
import { useLmsStore } from '@/lib/stores/useLmsStore'

/**
 * Внутренняя оболочка LMS с проверкой авторизации.
 *
 * Ожидает гидратации Zustand-стора, затем проверяет наличие токена.
 * Рендерит sidebar, topbar и основной контент только для авторизованных.
 *
 * @param children - дочерние страницы, отображаемые в области main
 */
function LmsShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const isAuthenticated = useIsAuthenticated()
  const hasHydrated     = useHasHydrated()
  const collapsed       = useLmsStore((s) => s.sidebarCollapsed)
  const toggleSidebar   = useLmsStore((s) => s.toggleSidebar)

  // Редирект на логин после гидратации стора, если нет авторизации
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  // Не рендерим ничего до гидратации (предотвращение мерцания)
  if (!hasHydrated) return null
  if (!isAuthenticated) return null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex flex-1 min-h-0">
        <LmsSidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <div className="flex-1 flex flex-col min-w-0">
          <LmsTopbar collapsed={collapsed} onToggle={toggleSidebar} />
          <main id="main-content" className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

/**
 * Экспортируемый layout-компонент для группы маршрутов (lms).
 *
 * Оборачивает LmsShell в Providers для инициализации React Query,
 * toast-уведомлений (Sonner) и других глобальных контекстов.
 *
 * @param children - вложенные страницы Next.js
 */
export default function LmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <LmsShell>{children}</LmsShell>
    </Providers>
  )
}
