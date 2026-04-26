'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import {
  LayoutDashboard, Users, FileText, Activity,
  Bell, Settings, Shield, LogOut, ChevronRight, Zap,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href: '/painel',       label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/usuarios',     label: 'Usuários',      icon: Users },
  { href: '/licitacoes',   label: 'Licitações',    icon: FileText },
  { href: '/scrapers',     label: 'Scrapers',      icon: Activity },
  { href: '/notificacoes', label: 'Notificações',  icon: Bell },
  { href: '/sistema',      label: 'Sistema',       icon: Settings },
]

function getCookieToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)licitabr:token=([^;]+)/)
  return match ? match[1] : null
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const store    = useAuthStore()
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
            nome: payload.nome ?? 'Admin',
            plano: payload.plano,
            role: payload.role ?? 'USER',
            ativo: true,
            emailVerificado: true,
          }, cookieToken)
        } catch {}
      }
      setAllowed(true)
    } else {
      router.replace('/login')
    }
    setChecked(true)
  }, [])

  if (!checked) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#faf9f6' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #d6f0e2', borderTop: '3px solid #166b45', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!allowed) return null

  const usuario = store.usuario

  function handleLogout() {
    store.clearAuth()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Sidebar admin */}
      <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 shrink-0"
        style={{ background: 'var(--brand-900)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{ background: 'var(--brand-600)' }}>
            <Shield size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-700 text-white leading-none">LicitaBR</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all duration-150', {
                  'text-white': active,
                  'text-white/50 hover:text-white/80': !active,
                })}
                style={active ? { background: 'rgba(255,255,255,0.1)' } : {}}>
                <Icon size={15} />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={13} className="opacity-40" />}
              </Link>
            )
          })}
        </nav>

        {/* Usuário */}
        <div className="px-3 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px' }}>
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs mb-2 transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Zap size={12} /> Ver painel do usuário
          </Link>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-700 text-white uppercase"
              style={{ background: 'var(--brand-600)' }}>
              {usuario?.nome?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-600 text-white truncate">{usuario?.nome?.split(' ')[0]}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{usuario?.role}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors text-white/30 hover:text-white/70">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
