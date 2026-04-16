'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, useIsAuthenticated, useHasHydrated } from '@/lib/stores/useAuthStore'
import { apiClient } from '@/lib/api/axios'
import { demoAdapter } from '@/lib/demo/adapter'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated()
  const hasHydrated     = useHasHydrated()
  const isDemoMode      = useAuthStore((s) => s.isDemoMode)
  const router          = useRouter()

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login')
      return
    }
    if (isDemoMode) {
      ;(apiClient.defaults as any).adapter = demoAdapter
    }
  }, [hasHydrated, isAuthenticated, isDemoMode, router])

  if (!hasHydrated) return null
  if (!isAuthenticated) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
