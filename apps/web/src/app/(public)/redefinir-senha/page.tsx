'use client'
// apps/web/src/app/(public)/redefinir-senha/page.tsx
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirForm />
    </Suspense>
  )
}

function RedefinirForm() {
  const params   = useSearchParams()
  const router   = useRouter()
  const token    = params.get('token') ?? ''

  const [nova,     setNova]     = useState('')
  const [confirma, setConfirma] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [showCon,  setShowCon]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [step,     setStep]     = useState<'form' | 'sucesso' | 'erro-token'>('form')
  const [erro,     setErro]     = useState<string | null>(null)

  // Token ausente na URL → estado de erro imediato
  useEffect(() => {
    if (!token) setStep('erro-token')
  }, [token])

  const regras = [
    { label: '8+ caracteres',     ok: nova.length >= 8 },
    { label: 'Maiúscula',         ok: /[A-Z]/.test(nova) },
    { label: 'Minúscula',         ok: /[a-z]/.test(nova) },
    { label: 'Número ou símbolo', ok: /[\d\W]/.test(nova) },
  ]
  const forca    = regras.filter((r) => r.ok).length
  const forcaCor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][forca]!

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (forca < 3) return setErro('Escolha uma senha mais forte.')
    if (nova !== confirma) return setErro('As senhas não coincidem.')

    setLoading(true)
    try {
      const resp = await fetch(`${API}/v1/auth/redefinir-senha`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, novaSenha: nova }),
      })
      const data = await resp.json()

      if (!resp.ok) {
        // Token inválido/expirado
        if (resp.status === 400) { setStep('erro-token'); return }
        throw new Error(data?.error ?? `Erro ${resp.status}`)
      }

      setStep('sucesso')
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Token inválido/expirado ──────────────────────────────
  if (step === 'erro-token') {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="card p-8 shadow-modal text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mx-auto mb-5">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h1 className="font-display text-xl font-700 text-text mb-2">Link inválido</h1>
          <p className="text-sm text-muted leading-relaxed mb-6">
            Este link de redefinição é inválido ou já expirou. Os links são válidos por <strong>1 hora</strong>.
          </p>
          <Link href="/esqueci-senha" className="btn-primary w-full justify-center">
            Solicitar novo link
          </Link>
          <Link href="/login" className="btn-ghost w-full justify-center mt-2">
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  // ── Sucesso ─────────────────────────────────────────────
  if (step === 'sucesso') {
    return (
      <div className="w-full max-w-sm animate-fade-up">
        <div className="card p-8 shadow-modal text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto mb-5">
            <CheckCircle2 size={28} className="text-brand-600" />
          </div>
          <h1 className="font-display text-xl font-700 text-text mb-2">Senha redefinida!</h1>
          <p className="text-sm text-muted leading-relaxed mb-2">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes…
          </p>
          <div className="h-1 bg-surface-muted rounded-full overflow-hidden mt-4">
            <div className="h-full bg-brand-600 rounded-full animate-[progress_3s_linear_forwards]" />
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ──────────────────────────────────────────
  return (
    <div className="w-full max-w-sm animate-fade-up">
      <div className="card p-8 shadow-modal">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 mb-5">
          <Lock size={22} className="text-brand-600" />
        </div>

        <h1 className="font-display text-2xl font-700 text-text tracking-tight mb-1">
          Criar nova senha
        </h1>
        <p className="text-sm text-muted mb-6">
          Escolha uma senha forte que você não use em outros lugares.
        </p>

        {erro && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 mb-5 animate-fade-in">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Nova senha */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={showNova ? 'text' : 'password'}
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="input pr-10"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNova((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                tabIndex={-1}
              >
                {showNova ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Barra de força */}
            {nova.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i < forca ? forcaCor : 'bg-surface-muted'
                      )}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {regras.map((r) => (
                    <span
                      key={r.label}
                      className={clsx(
                        'text-[11px] flex items-center gap-1 transition-colors',
                        r.ok ? 'text-emerald-600' : 'text-muted'
                      )}
                    >
                      <span className={clsx('text-[10px]', r.ok ? 'opacity-100' : 'opacity-0')}>✓</span>
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirmar */}
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                type={showCon ? 'text' : 'password'}
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                placeholder="Repita a senha"
                className={clsx(
                  'input pr-10',
                  confirma && confirma === nova && 'border-emerald-400',
                  confirma && confirma !== nova && 'border-red-300'
                )}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCon((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                tabIndex={-1}
              >
                {showCon ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirma && confirma !== nova && (
              <p className="text-[11px] text-red-500 mt-1">As senhas não coincidem.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || forca < 3 || nova !== confirma}
            className="w-full btn-primary py-2.5 gap-2 disabled:opacity-50"
          >
            {loading ? <Spinner /> : <Lock size={15} />}
            {loading ? 'Salvando…' : 'Definir nova senha'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
            <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </div>
      </div>
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
