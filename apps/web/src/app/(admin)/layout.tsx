'use client'
// apps/web/src/app/(admin)/layout.tsx
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import {
  LayoutDashboard, Users, FileText, Activity,
  Bell, Settings, Shield, LogOut, ChevronRight,
  Zap, Menu, X,
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/usuarios',      label: 'Usuários',       icon: Users },
  { href: '/admin/licitacoes',    label: 'Licitações',     icon: FileText },
  { href: '/admin/scrapers',      label: 'Scrapers',       icon: Activity },
  { href: '/admin/notificacoes',  label: 'Notificações',   icon: Bell },
  { href: '/admin/sistema',       label: 'Sistema',        icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const pathname    = usePathname()
  const { usuario, clearAuth } = useAuthStore()
  const [open, setOpen] = useState(false)

  // Guard — redireciona se não for admin
  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    if (usuario.role !== 'ADMIN' && usuario.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [usuario, router])

  if (!usuario || (usuario.role !== 'ADMIN' && usuario.role !== 'SUPER_ADMIN')) return null

  function handleLogout() {
    clearAuth()
    router.push('/login')
  }

  const Sidebar = ({ mobile = false }) => (
    <aside className={clsx(
      'flex flex-col bg-[#0f1117] text-white',
      mobile ? 'w-full h-full' : 'w-64 h-screen sticky top-0 shrink-0'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <Shield size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-700 tracking-tight">LicitaBR</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin</p>
        </div>
        {mobile && (
          <button onClick={() => setOpen(false)} className="ml-auto text-white/50 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-500 transition-all',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Usuário logado */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-700 text-white uppercase">
            {usuario.nome?.[0] ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-600 text-white truncate">{usuario.nome}</p>
            <p className="text-[10px] text-white/40 truncate">{usuario.role}</p>
          </div>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors mb-1.5">
          <Zap size={12} /> Ver painel do usuário
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-red-400 transition-colors"
        >
          <LogOut size={12} /> Sair
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-[#f8f7f4]">
      {/* Sidebar desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar mobile */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-surface-border bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="text-muted hover:text-text">
            <Menu size={20} />
          </button>
          <span className="text-sm font-600 text-text">Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-700 text-white uppercase">
              {usuario.nome?.[0] ?? 'A'}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
