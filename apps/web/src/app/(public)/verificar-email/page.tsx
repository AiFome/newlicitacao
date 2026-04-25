'use client'
// apps/web/src/app/(public)/verificar-email/page.tsx
//
// Esta página é o fallback visual para o fluxo de verificação de e-mail.
// Normalmente a API redireciona direto para /dashboard?emailVerificado=1,
// mas se o token expirar a API retorna JSON de erro — o usuário precisa
// de uma página amigável para reenviar o link.

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2 } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <VerificarEmailContent />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="w-full max-w-sm">
      <div className="card p-8 shadow-modal text-center">
        <Loader2 size={32} className="animate-spin text-muted mx-auto mb-4" />
        <p className="text-sm text-muted">Verificando seu e-mail…</p>
      </div>
    </div>
  )
}

function VerificarEmailContent() {
  const params = useSearchParams()
  const token  = params.get('token')

  const [estado, setEstado]   = useState<'verificando' | 'sucesso' | 'expirado' | 'erro'>('verificando')
  const [email,  setEmail]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const [reenviado, setReen]  = useState(false)
  const [erroMsg, setErroMsg] = useState('')

  // Se houver token na URL, tenta verificar automaticamente
  useEffect(() => {
    if (!token) {
      setEstado('expirado')
      return
    }

    fetch(`${API}/v1/auth/verificar-email?token=${encodeURIComponent(token)}`)
      .then(async (resp) => {
        if (resp.ok || resp.redirected) {
          setEstado('sucesso')
          // Redireciona para dashboard após 2s
          setTimeout(() => { window.location.href = '/dashboard?emailVerificado=1' }, 2000)
        } else {
          const data = await resp.json().catch(() => ({}))
          if (resp.status === 400) {
            setEstado('expirado')
          } else {
            setEstado('erro')
            setErroMsg(data?.error ?? 'Erro ao verificar e-mail.')
          }
        }
      })
      .catch(() => setEstado('erro'))
  }, [token])

  async function reenviar() {
    if (!email) return
    setEnviando(true)
    try {
      // Usa o endpoint público de login para obter token temporário e reenviar
      // Na prática o usuário provavelmente está logado — o banner usa o endpoint autenticado
      // Esta página é para usuários que clicaram no link sem estar logados
      const resp = await fetch(`${API}/v1/auth/reenviar-verificacao-publico`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      if (resp.ok) {
        setReen(true)
      } else {
        const data = await resp.json().catch(() => ({}))
        setErroMsg(data?.error ?? 'Não foi possível reenviar. Tente fazer login novamente.')
      }
    } catch {
      setErroMsg('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  // ── Verificando ─────────────────────────────────────────
  if (estado === 'verificando') return <Loading />

  // ── Sucesso ─────────────────────────────────────────────
  if (estado === 'sucesso') {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="card p-8 shadow-modal text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 mx-auto mb-5">
            <CheckCircle2 size={32} className="text-brand-600" />
          </div>
          <h1 className="font-display text-xl font-700 text-text mb-2 tracking-tight">
            E-mail verificado!
          </h1>
          <p className="text-sm text-muted mb-5 leading-relaxed">
            Sua conta está ativa. Redirecionando para o painel…
          </p>
          <div className="h-1 bg-surface-muted rounded-full overflow-hidden">
            <div className="h-full bg-brand-600 rounded-full animate-[progress_2s_linear_forwards]" />
          </div>
          <Link href="/dashboard" className="btn-ghost w-full justify-center mt-4 text-sm">
            Ir ao painel agora <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  // ── Link expirado ────────────────────────────────────────
  if (estado === 'expirado') {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="card p-8 shadow-modal">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100 mx-auto mb-5">
            <Mail size={26} className="text-amber-500" />
          </div>

          <h1 className="font-display text-xl font-700 text-text mb-2 text-center tracking-tight">
            Link expirado
          </h1>
          <p className="text-sm text-muted text-center mb-6 leading-relaxed">
            Os links de verificação expiram em 24 horas. Informe seu e-mail para receber um novo link.
          </p>

          {reenviado ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              <CheckCircle2 size={16} className="shrink-0" />
              Novo link enviado! Verifique sua caixa de entrada.
            </div>
          ) : (
            <div className="space-y-3">
              {erroMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700">
                  <AlertCircle size={14} className="shrink-0" />
                  {erroMsg}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                  Seu e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && reenviar()}
                  placeholder="joao@empresa.com.br"
                  className="input"
                  autoFocus
                />
              </div>

              <button
                onClick={reenviar}
                disabled={enviando || !email}
                className="btn-primary w-full justify-center gap-2"
              >
                {enviando ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Mail size={15} />
                )}
                {enviando ? 'Enviando…' : 'Reenviar link de verificação'}
              </button>
            </div>
          )}

          <div className="mt-5 text-center">
            <Link href="/login" className="text-sm text-muted hover:text-brand-600 transition-colors">
              Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Erro genérico ────────────────────────────────────────
  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="card p-8 shadow-modal text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-100 mx-auto mb-5">
          <AlertCircle size={26} className="text-red-400" />
        </div>
        <h1 className="font-display text-xl font-700 text-text mb-2 tracking-tight">Algo deu errado</h1>
        <p className="text-sm text-muted mb-5 leading-relaxed">{erroMsg || 'Erro ao verificar e-mail. Tente novamente.'}</p>
        <Link href="/login" className="btn-primary w-full justify-center gap-2">
          <ArrowRight size={15} /> Ir para o login
        </Link>
      </div>
    </div>
  )
}
