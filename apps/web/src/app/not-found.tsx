// apps/web/src/app/not-found.tsx
import Link from 'next/link'
import { FileSearch, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg, #f5f4f0)' }}>
      <div className="text-center max-w-md">

        {/* Ícone */}
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-50 border border-brand-100 mx-auto mb-8">
          <FileSearch size={36} className="text-brand-400" />
        </div>

        {/* Código */}
        <p className="font-display text-7xl font-700 text-brand-100 select-none mb-2">404</p>

        <h1 className="font-display text-2xl font-700 text-text tracking-tight mb-3">
          Página não encontrada
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          O endereço que você acessou não existe ou foi removido.
          Verifique o link ou navegue para uma das páginas abaixo.
        </p>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/busca"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            <Search size={16} />
            Buscar editais
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-5 py-2.5 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
          >
            <ArrowLeft size={16} />
            Ir ao dashboard
          </Link>
        </div>

        {/* Links rápidos */}
        <div className="mt-10 pt-6 border-t border-surface-border">
          <p className="text-xs text-muted mb-3">Links úteis</p>
          <div className="flex items-center justify-center gap-6">
            {[
              { href: '/alertas',       label: 'Alertas' },
              { href: '/favoritos',     label: 'Favoritos' },
              { href: '/configuracoes', label: 'Configurações' },
              { href: '/planos',        label: 'Planos' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="text-xs text-muted hover:text-brand-600 transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
