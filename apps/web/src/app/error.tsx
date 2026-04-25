'use client'
// apps/web/src/app/error.tsx
import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Captura no Sentry em produção
    if (process.env.NODE_ENV === 'production') {
      import('@/lib/sentry').then(({ captureFrontendError }) => {
        captureFrontendError(error, { digest: error.digest })
      })
    } else {
      console.error('[Error Boundary]', error)
    }
  }, [error])

  const isProd = process.env.NODE_ENV === 'production'

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg, #f5f4f0)' }}>
      <div className="text-center max-w-md">

        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 border border-red-100 mx-auto mb-8">
          <AlertTriangle size={36} className="text-red-400" />
        </div>

        <h1 className="font-display text-2xl font-700 text-text tracking-tight mb-3">
          Algo deu errado
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-3">
          Ocorreu um erro inesperado. Nossa equipe já foi notificada.
          Você pode tentar recarregar a página ou voltar ao início.
        </p>

        {/* Detalhe do erro — só em dev */}
        {!isProd && error.message && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-left">
            <p className="text-xs font-mono text-red-700 break-all">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] text-red-400 mt-1">digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-5 py-2.5 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
          >
            <ArrowLeft size={16} />
            Ir ao dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
