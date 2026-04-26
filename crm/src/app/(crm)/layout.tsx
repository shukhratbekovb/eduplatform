'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Providers } from '@/components/shared/Providers'
import { CrmSidebar } from '@/components/crm/layout/CrmSidebar'
import { CrmTopbar } from '@/components/crm/layout/CrmTopbar'
import { useIsAuthenticated, useHasHydrated } from '@/lib/stores/useAuthStore'

function CrmShell({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const isAuthenticated = useIsAuthenticated()
  const hasHydrated     = useHasHydrated()

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  if (!hasHydrated) return null
  if (!isAuthenticated) return null

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
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
