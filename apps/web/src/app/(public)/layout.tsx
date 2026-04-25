// apps/web/src/app/(public)/layout.tsx
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* Barra superior mínima */}
      <header className="px-8 py-5 flex items-center justify-between">
        <Link href="/landing" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 group-hover:bg-brand-500 transition-colors">
            <FileText size={15} className="text-white" />
          </div>
          <span className="font-display text-[15px] font-700 text-text tracking-tight">LicitaBR</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <Link href="/planos" className="hover:text-text transition-colors">Planos</Link>
          <Link href="/login" className="hover:text-text transition-colors">Entrar</Link>
          <Link href="/cadastro" className="btn-primary text-sm px-4 py-2">Começar grátis</Link>
        </nav>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Rodapé mínimo */}
      <footer className="px-8 py-5 text-center text-xs text-muted border-t border-surface-border">
        © {new Date().getFullYear()} LicitaBR · 
        <Link href="/privacidade" className="hover:text-brand-600 ml-1">Privacidade</Link>
        <span className="mx-2">·</span>
        <Link href="/termos" className="hover:text-brand-600">Termos</Link>
      </footer>

    </div>
  )
}
