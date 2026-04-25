// apps/web/src/app/(app)/layout.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/layout/Sidebar'
import { NotificacaoToastLive } from '@/components/layout/NotificacaoToastLive'
import { EmailVerificacaoBanner } from '@/components/layout/EmailVerificacaoBanner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login')
  }, [hydrated, isAuthenticated, router])

  if (!hydrated || !isAuthenticated) return null

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <EmailVerificacaoBanner />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <NotificacaoToastLive />
    </div>
  )
}
