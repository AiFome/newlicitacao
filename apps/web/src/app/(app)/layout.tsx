'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { Sidebar } from '@/components/layout/Sidebar'
import { NotificacaoToastLive } from '@/components/layout/NotificacaoToastLive'
import { EmailVerificacaoBanner } from '@/components/layout/EmailVerificacaoBanner'

function getCookieToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)licitabr:token=([^;]+)/)
  return match ? match[1] : null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const store = useAuthStore()
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const cookieToken = getCookieToken()

    if (cookieToken) {
      if (!store.token) {
        try {
          const b64 = cookieToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
          const payload = JSON.parse(atob(b64))
          store.setAuth({
            id: payload.sub,
            email: payload.email,
            nome: payload.nome ?? 'Usuário',
            plano: payload.plano,
            role: payload.role ?? 'USER',
            ativo: true,
            emailVerificado: true,
          }, cookieToken)
        } catch {}
      }
      setAllowed(true)
    } else {
      setAllowed(false)
      router.replace('/login')
    }
    setChecked(true)
  }, [])

  useEffect(() => {
    if (checked && !allowed) {
      router.replace('/login')
    }
  }, [checked, allowed, router])

  if (!checked) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #d6f0e2', borderTop: '3px solid #166b45', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!allowed) return null

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
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
