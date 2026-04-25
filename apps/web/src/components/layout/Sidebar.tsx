// apps/web/src/components/layout/Sidebar.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search, LayoutDashboard, Heart, Bell, Settings,
  LogOut, FileText, ChevronRight, Zap, Menu, X, Shield,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { authApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { NotificacoesPainel } from '@/components/layout/NotificacoesPainel'
import clsx from 'clsx'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/busca',        label: 'Buscar Editais',     icon: Search },
  { href: '/favoritos',    label: 'Minhas Licitações',  icon: Heart },
  { href: '/alertas',      label: 'Alertas',            icon: Bell },
]

const NAV_BOTTOM = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

const PLANO_BADGE: Record<string, { label: string; cls: string }> = {
  FREE:         { label: 'Gratuito',   cls: 'bg-gray-100 text-gray-600' },
  BASICO:       { label: 'Básico',     cls: 'bg-blue-50 text-blue-700' },
  PROFISSIONAL: { label: 'Pro',        cls: 'bg-brand-100 text-brand-700' },
  ENTERPRISE:   { label: 'Enterprise', cls: 'bg-amber-50 text-amber-700' },
}

export function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { usuario, clearAuth } = useAuthStore()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleLogout() {
    await authApi.logout().catch(() => {})
    clearAuth()
    router.push('/login')
  }

  const plano = PLANO_BADGE[usuario?.plano ?? 'FREE'] ?? PLANO_BADGE['FREE']!

  const sidebarContent = (
    <aside className="flex h-full w-60 flex-col border-r border-surface-border bg-white">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <FileText size={16} className="text-white" />
        </div>
        <span className="font-display text-[15px] font-700 text-text tracking-tight">LicitaBR</span>
        <span className={clsx('ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold', plano.cls)}>
          {plano.label}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden ml-1 text-muted hover:text-text"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3 pt-4 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={clsx(active ? 'nav-item-active' : 'nav-item')}>
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={14} className="opacity-40" />}
            </Link>
          )
        })}
        {(usuario?.plano === 'FREE' || usuario?.plano === 'BASICO') && (
          <Link
            href="/planos"
            className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium bg-brand-600 text-white hover:bg-brand-500 transition-all"
          >
            <Zap size={16} />
            <span className="flex-1">Fazer upgrade</span>
          </Link>
        )}

        {/* Link para o painel admin — visível apenas para ADMIN e SUPER_ADMIN */}
        {(usuario?.role === 'ADMIN' || usuario?.role === 'SUPER_ADMIN') && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <Link
              href="/admin/dashboard"
              className={clsx(
                pathname.startsWith('/admin') ? 'nav-item-active' : 'nav-item',
                'gap-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100'
              )}
            >
              <Shield size={16} />
              <span className="flex-1">Painel Admin</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-surface-border p-3">
        {NAV_BOTTOM.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={clsx(pathname === href ? 'nav-item-active' : 'nav-item')}>
            <Icon size={17} />
            {label}
          </Link>
        ))}
        <div className="mt-2 mb-2 px-1">
          <NotificacoesPainel />
        </div>
        <div className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2.5 border border-surface-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-semibold shrink-0">
            {usuario?.nome?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text truncate">{usuario?.nome}</p>
            <p className="text-[11px] text-muted truncate">{usuario?.email}</p>
          </div>
          <button onClick={handleLogout} className="text-muted hover:text-red-500 transition-colors" title="Sair">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-white shadow-card text-muted hover:text-text"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>

      <div className="hidden lg:flex h-screen w-60 shrink-0">
        {sidebarContent}
      </div>

      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex h-full w-60 animate-slide-in">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
