'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Providers } from '@/components/shared/Providers'
import { CrmSidebar } from '@/components/crm/layout/CrmSidebar'
import { CrmTopbar } from '@/components/crm/layout/CrmTopbar'
import { DemoBanner } from '@/components/crm/layout/DemoBanner'
import { useAuthStore, useIsAuthenticated, useHasHydrated } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { demoAdapter } from '@/lib/demo/adapter'

function CrmShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const isAuthenticated = useIsAuthenticated()
  const hasHydrated     = useHasHydrated()
  const isDemoMode      = useAuthStore((s) => s.isDemoMode)

  // Re-install demo adapter after page reload
  useEffect(() => {
    if (isDemoMode) {
      ;(apiClient.defaults as any).adapter = demoAdapter
    }
  }, [isDemoMode])

  // Redirect only AFTER Zustand has restored from localStorage
  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  // While hydrating — show nothing (prevents flash)
  if (!hasHydrated) return null

  // After hydration — if not authenticated, show nothing (redirect is in progress)
  if (!isAuthenticated) return null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <DemoBanner />
      <div className="flex flex-1 min-h-0">
        <CrmSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <CrmTopbar />
          <main id="main-content" className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <CrmShell>{children}</CrmShell>
    </Providers>
  )
}
