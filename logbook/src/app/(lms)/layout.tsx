'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Providers } from '@/components/shared/Providers'
import { LmsSidebar } from '@/components/lms/layout/LmsSidebar'
import { LmsTopbar } from '@/components/lms/layout/LmsTopbar'
import { DemoBanner } from '@/components/lms/layout/DemoBanner'
import { useAuthStore, useIsAuthenticated, useHasHydrated } from '@/lib/stores/useAuthStore'
import { useLmsStore } from '@/lib/stores/useLmsStore'
import { apiClient } from '@/lib/api/axios'
import { demoAdapter } from '@/lib/demo/adapter'

function LmsShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const isAuthenticated = useIsAuthenticated()
  const hasHydrated     = useHasHydrated()
  const isDemoMode      = useAuthStore((s) => s.isDemoMode)
  const collapsed       = useLmsStore((s) => s.sidebarCollapsed)
  const toggleSidebar   = useLmsStore((s) => s.toggleSidebar)

  useEffect(() => {
    if (isDemoMode) {
      ;(apiClient.defaults as any).adapter = demoAdapter
    }
  }, [isDemoMode])

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  if (!hasHydrated) return null
  if (!isAuthenticated) return null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DemoBanner />
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

export default function LmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <LmsShell>{children}</LmsShell>
    </Providers>
  )
}
