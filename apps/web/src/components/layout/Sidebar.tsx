'use client'
// apps/web/src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import {
  LayoutDashboard, Search, Heart, Bell,
  Settings, LogOut, FileText, Shield, ChevronRight,
  Zap, Tag, User,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href: '/dashboard',  label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/busca',      label: 'Buscar Editais',    icon: Search },
  { href: '/favoritos',  label: 'Meus Favoritos',    icon: Heart },
  { href: '/alertas',    label: 'Alertas',           icon: Bell },
  { href: '/monitorar',  label: 'Monitorar',         icon: Tag },
  { href: '/perfil',     label: 'Meu Perfil',        icon: User as any },
]

const NAV_BOTTOM = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

const PLANO_BADGE: Record<string, { label: string; cls: string }> = {
  FREE:         { label: 'Free',          cls: 'text-white/40 bg-white/5' },
  BASICO:       { label: 'Básico',        cls: 'text-blue-300 bg-blue-900/30' },
  PROFISSIONAL: { label: 'Pro',           cls: 'text-emerald-300 bg-emerald-900/30' },
  ENTERPRISE:   { label: 'Enterprise',   cls: 'text-purple-300 bg-purple-900/30' },
}

export function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { usuario, clearAuth } = useAuthStore()

  function handleLogout() {
    clearAuth()
    router.push('/login')
  }

  const planoBadge = PLANO_BADGE[usuario?.plano ?? 'FREE']

  return (
    <aside className="flex flex-col w-60 h-screen sticky top-0 shrink-0 select-none"
      style={{ background: 'var(--brand-900)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: 'var(--brand-500)' }}>
          <FileText size={15} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-700 text-white tracking-tight leading-none">LicitaBR</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Monitoramento</p>
        </div>
      </div>

      {/* Nav principal */}
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

        {/* Separador */}
        {(usuario?.role === 'ADMIN' || usuario?.role === 'SUPER_ADMIN') && (
          <div className="pt-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="px-3 pb-1.5 text-[10px] font-600 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Admin
            </p>
            <Link href="/painel"
              className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all duration-150')}
              style={{
                background: pathname.startsWith('/painel') || pathname.startsWith('/usuarios') || pathname.startsWith('/scrapers') ? 'rgba(56,168,118,0.15)' : 'transparent',
                color: pathname.startsWith('/painel') ? 'var(--brand-300)' : 'rgba(255,255,255,0.5)',
              }}>
              <Shield size={15} />
              <span>Painel Admin</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px' }}>
        {NAV_BOTTOM.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-500 transition-all duration-150 text-white/50 hover:text-white/80 mb-1">
            <Icon size={15} />
            {label}
          </Link>
        ))}

        {/* Planos */}
        {usuario?.plano === 'FREE' && (
          <Link href="/planos"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-500 mb-3 transition-all duration-150"
            style={{ background: 'rgba(56,168,118,0.12)', color: 'var(--brand-300)', border: '1px solid rgba(56,168,118,0.2)' }}>
            <Zap size={12} />
            Fazer upgrade
          </Link>
        )}

        {/* Usuário */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-700 text-white uppercase"
            style={{ background: 'var(--brand-600)' }}>
            {usuario?.nome?.[0] ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-600 text-white truncate">{usuario?.nome?.split(' ')[0]}</p>
            <span className={clsx('text-[10px] font-600 px-1.5 py-0.5 rounded-md', planoBadge.cls)}>
              {planoBadge.label}
            </span>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors text-white/30 hover:text-white/70" title="Sair">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
