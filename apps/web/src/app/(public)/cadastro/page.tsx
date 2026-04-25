'use client'
// apps/web/src/app/(public)/cadastro/page.tsx
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2,
  Check, X, Building2, Bell, Search
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import clsx from 'clsx'

// ── Regras de validação de senha ─────────────────────────
const SENHA_REGRAS = [
  { label: 'Mínimo 8 caracteres',       test: (s: string) => s.length >= 8 },
  { label: 'Letra maiúscula',           test: (s: string) => /[A-Z]/.test(s) },
  { label: 'Letra minúscula',           test: (s: string) => /[a-z]/.test(s) },
  { label: 'Número ou símbolo',         test: (s: string) => /[\d\W]/.test(s) },
]

// Força da senha: 0–4
function forcaSenha(senha: string): number {
  return SENHA_REGRAS.filter((r) => r.test(senha)).length
}

const FORCA_LABEL = ['', 'Fraca', 'Razoável', 'Boa', 'Forte']
const FORCA_COR   = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500']

// ── Benefícios exibidos à direita ───────────────────────
const BENEFICIOS = [
  { icon: Search,    texto: 'Todos os portais de licitação em um só lugar' },
  { icon: Bell,      texto: 'Alertas automáticos por e-mail e Telegram' },
  { icon: Building2, texto: 'Dashboard completo de gestão de editais' },
]

export default function CadastroPage() {
  const router  = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuth  = useAuthStore((s) => s.isAuthenticated)

  const [nome,     setNome]     = useState('')
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [confirma, setConfirma] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [showCo,   setShowCo]   = useState(false)
  const [aceito,   setAceito]   = useState(false)

  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)
  const [step,     setStep]     = useState<'idle' | 'loading' | 'success'>('idle')

  // Erros de campo individuais
  const [erros, setErros] = useState<Record<string, string>>({})

  const forca = forcaSenha(senha)

  // Redireciona se já autenticado
  useEffect(() => {
    if (isAuth) router.replace('/dashboard')
  }, [isAuth, router])

  // Validação de campo individual
  const validarCampo = useCallback((campo: string, valor: string) => {
    let msg = ''
    if (campo === 'nome'  && valor.trim().length < 2) msg = 'Nome deve ter ao menos 2 caracteres.'
    if (campo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) msg = 'E-mail inválido.'
    if (campo === 'senha' && valor.length > 0 && forca < 2) msg = 'Senha muito fraca.'
    if (campo === 'confirma' && valor !== senha)  msg = 'As senhas não coincidem.'
    setErros((p) => ({ ...p, [campo]: msg }))
  }, [senha, forca])

  function validate(): boolean {
    const novos: Record<string, string> = {}
    if (!nome.trim())                               novos.nome     = 'Nome obrigatório.'
    if (!email || !/\S+@\S+\.\S+/.test(email))     novos.email    = 'E-mail inválido.'
    if (!senha || forca < 2)                        novos.senha    = 'Senha muito fraca.'
    if (confirma !== senha)                         novos.confirma = 'As senhas não coincidem.'
    if (!aceito)                                    novos.aceito   = 'Aceite os termos para continuar.'
    setErros(novos)
    return Object.keys(novos).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (!validate()) return

    setStep('loading')
    setLoading(true)

    try {
      const { usuario, token } = await authApi.register(nome.trim(), email, senha)
      setStep('success')
      setAuth(usuario, token)
      setTimeout(() => router.push('/dashboard'), 800)
    } catch (err: unknown) {
      setStep('idle')
      setErro(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-start animate-fade-up">

      {/* ── Painel esquerdo: benefícios ─────────────────── */}
      <div className="hidden md:flex flex-col justify-center py-4">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1 mb-4">
            ✦ 14 dias grátis · Sem cartão
          </span>
          <h2 className="font-display text-3xl font-800 text-text leading-tight tracking-tight mb-3">
            Monitore licitações<br />sem esforço.
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            Mais de 1.200 novos editais publicados por dia nos principais portais públicos do Brasil.
            Receba os relevantes diretamente no seu e-mail.
          </p>
        </div>

        <div className="space-y-4 mb-10">
          {BENEFICIOS.map(({ icon: Icon, texto }) => (
            <div key={texto} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shrink-0">
                <Icon size={17} />
              </div>
              <p className="text-sm text-text leading-snug">{texto}</p>
            </div>
          ))}
        </div>

        {/* Depoimento */}
        <div className="rounded-xl border border-surface-border bg-white p-5">
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="14" height="14" fill="#f59e0b" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-sm text-text leading-relaxed italic">
            "Configurei um alerta para licitações de TI em SP e em 2 dias já tinha 12 novos editais na caixa de entrada. Economizo horas por semana."
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="h-7 w-7 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 text-xs font-semibold">RC</div>
            <div>
              <p className="text-xs font-medium text-text">Rafael C.</p>
              <p className="text-[11px] text-muted">Consultor de licitações · São Paulo</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel direito: formulário ──────────────────── */}
      <div className="card p-8 shadow-modal">

        <div className="mb-6">
          <h1 className="font-display text-2xl font-700 text-text tracking-tight mb-1">
            Criar conta grátis
          </h1>
          <p className="text-sm text-muted">
            Comece agora. Sem cartão de crédito.
          </p>
        </div>

        {/* Erro global */}
        {erro && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 mb-5 animate-fade-in">
            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{erro}</p>
          </div>
        )}

        {/* Sucesso */}
        {step === 'success' && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 mb-5 animate-fade-in">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 font-medium">Conta criada! Bem-vindo ao LicitaBR 🎉</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Nome */}
          <Field label="Nome completo" error={erros.nome}>
            <input
              type="text"
              autoComplete="name"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={(e) => validarCampo('nome', e.target.value)}
              placeholder="João Silva"
              className={clsx('input', erros.nome && 'border-red-300 focus:ring-red-400')}
              disabled={loading}
            />
          </Field>

          {/* E-mail */}
          <Field label="E-mail profissional" error={erros.email}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validarCampo('email', e.target.value)}
              placeholder="joao@empresa.com.br"
              className={clsx('input', erros.email && 'border-red-300 focus:ring-red-400')}
              disabled={loading}
            />
          </Field>

          {/* Senha */}
          <Field label="Senha" error={erros.senha}>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onBlur={(e) => validarCampo('senha', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={clsx('input pr-10', erros.senha && 'border-red-300 focus:ring-red-400')}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Barra de força */}
            {senha.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'h-1 flex-1 rounded-full transition-all duration-300',
                        i < forca ? FORCA_COR[forca] : 'bg-surface-muted'
                      )}
                    />
                  ))}
                </div>
                <p className={clsx('text-[11px] font-medium', forca >= 3 ? 'text-emerald-600' : forca === 2 ? 'text-amber-600' : 'text-red-500')}>
                  {FORCA_LABEL[forca]}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {SENHA_REGRAS.map((r) => {
                    const ok = r.test(senha)
                    return (
                      <div key={r.label} className="flex items-center gap-1.5">
                        {ok
                          ? <Check size={11} className="text-emerald-500 shrink-0" />
                          : <X    size={11} className="text-muted/50 shrink-0" />
                        }
                        <span className={clsx('text-[11px]', ok ? 'text-emerald-600' : 'text-muted')}>{r.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Field>

          {/* Confirmar senha */}
          <Field label="Confirmar senha" error={erros.confirma}>
            <div className="relative">
              <input
                type={showCo ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                onBlur={(e) => validarCampo('confirma', e.target.value)}
                placeholder="Repita a senha"
                className={clsx(
                  'input pr-10',
                  erros.confirma
                    ? 'border-red-300 focus:ring-red-400'
                    : confirma && confirma === senha
                    ? 'border-emerald-400 focus:ring-emerald-400'
                    : ''
                )}
                disabled={loading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {confirma && confirma === senha && <Check size={14} className="text-emerald-500" />}
                <button
                  type="button"
                  onClick={() => setShowCo((p) => !p)}
                  className="text-muted hover:text-text transition-colors"
                  tabIndex={-1}
                >
                  {showCo ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </Field>

          {/* Aceitar termos */}
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={aceito}
                  onChange={(e) => setAceito(e.target.checked)}
                  className="sr-only"
                />
                <div className={clsx(
                  'h-4 w-4 rounded border-2 flex items-center justify-center transition-all',
                  aceito
                    ? 'bg-brand-600 border-brand-600'
                    : erros.aceito
                    ? 'border-red-400 bg-white'
                    : 'border-surface-border bg-white group-hover:border-brand-400'
                )}>
                  {aceito && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-xs text-muted leading-relaxed">
                Concordo com os{' '}
                <Link href="/termos" target="_blank" className="text-brand-600 hover:underline">Termos de Uso</Link>
                {' '}e{' '}
                <Link href="/privacidade" target="_blank" className="text-brand-600 hover:underline">Política de Privacidade</Link>.
                Posso receber comunicações por e-mail e posso cancelar quando quiser.
              </span>
            </label>
            {erros.aceito && <p className="text-xs text-red-500 mt-1 ml-6">{erros.aceito}</p>}
          </div>

          {/* Botão */}
          <button
            type="submit"
            disabled={loading || step === 'success'}
            className={clsx(
              'w-full btn gap-2 py-2.5 mt-1 transition-all duration-200',
              step === 'success'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'btn-primary'
            )}
          >
            {step === 'loading' ? (
              <><Spinner /> Criando conta…</>
            ) : step === 'success' ? (
              <><CheckCircle2 size={16} /> Conta criada!</>
            ) : (
              <><UserPlus size={16} /> Criar conta grátis</>
            )}
          </button>

        </form>

        {/* Já tem conta */}
        <p className="text-center text-sm text-muted mt-5">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Entrar
          </Link>
        </p>

      </div>
    </div>
  )
}

// ── Componentes auxiliares ──────────────────────────────

function Field({
  label, error, children
}: {
  label: string; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle size={11} className="shrink-0" /> {error}
        </p>
      )}
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
