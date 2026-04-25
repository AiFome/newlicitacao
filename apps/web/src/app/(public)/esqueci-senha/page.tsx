'use client'
// apps/web/src/app/(public)/esqueci-senha/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

export default function EsqueciSenhaPage() {
  const [email,  setEmail]  = useState('')
  const [step,   setStep]   = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [erro,   setErro]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErro('Informe um e-mail válido.')
      return
    }
    setErro(null)
    setStep('loading')

    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const resp = await fetch(`${API}/v1/auth/esqueci-senha`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      // A API sempre retorna 200 (não revela se o e-mail existe)
      if (resp.ok || resp.status === 200) {
        setStep('sent')
      } else {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data?.error ?? `Erro ${resp.status}`)
      }
    } catch (err: unknown) {
      setStep('error')
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar. Tente novamente.')
    }
  }

  if (step === 'sent') {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="card p-8 shadow-modal text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto mb-5">
            <CheckCircle2 size={28} className="text-brand-600" />
          </div>
          <h1 className="font-display text-xl font-700 text-text mb-2">E-mail enviado!</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            Se existe uma conta com <strong className="text-text">{email}</strong>,
            você receberá um link de redefinição de senha em instantes.
          </p>
          <p className="text-xs text-muted mb-6">
            Não recebeu? Verifique a caixa de spam ou aguarde alguns minutos.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => { setStep('idle'); setEmail('') }}
              className="btn-ghost w-full gap-2"
            >
              <Send size={14} /> Reenviar e-mail
            </button>
            <Link href="/login" className="btn-primary w-full gap-2 justify-center">
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="card p-8 shadow-modal">

        {/* Ícone */}
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 mb-5">
          <Mail size={22} className="text-brand-600" />
        </div>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-700 text-text tracking-tight mb-1">
            Esqueceu sua senha?
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Informe seu e-mail cadastrado e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 mb-5 animate-fade-in">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
              E-mail cadastrado
            </label>
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErro(null) }}
              placeholder="seu@email.com.br"
              className={clsx('input', erro && 'border-red-300 focus:ring-red-400')}
              disabled={step === 'loading'}
            />
          </div>

          <button
            type="submit"
            disabled={step === 'loading'}
            className="w-full btn-primary gap-2 py-2.5"
          >
            {step === 'loading' ? (
              <><Spinner /> Enviando…</>
            ) : (
              <><Send size={15} /> Enviar link de redefinição</>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={14} />
            Voltar ao login
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-muted mt-5 leading-relaxed">
        Lembra da senha?{' '}
        <Link href="/login" className="text-brand-600 hover:underline">Entrar agora</Link>
      </p>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
