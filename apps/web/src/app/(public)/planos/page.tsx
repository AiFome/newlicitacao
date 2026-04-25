'use client'
// apps/web/src/app/(public)/planos/page.tsx
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Zap, Building2, User, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import clsx from 'clsx'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// IDs dos preços no Stripe (configurar no .env.local)
const PRICE_IDS = {
  BASICO:       process.env.NEXT_PUBLIC_STRIPE_PRICE_BASICO       ?? 'price_basico',
  PROFISSIONAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFISSIONAL ?? 'price_profissional',
  ENTERPRISE:   null, // contato direto
} as const

const PLANOS = [
  {
    id:          'FREE' as const,
    nome:        'Gratuito',
    preco:       'R$ 0',
    periodo:     'para sempre',
    descricao:   'Para conhecer a plataforma.',
    icone:       <User size={20} />,
    destaque:    false,
    cta:         'Começar grátis',
    features: [
      { texto: '1 alerta ativo',          ok: true },
      { texto: '3 palavras-chave',         ok: true },
      { texto: 'Apenas PNCP',             ok: true },
      { texto: '5 downloads/mês',          ok: true },
      { texto: 'E-mail',                  ok: true },
      { texto: 'Telegram',                ok: false },
      { texto: 'Todos os portais',         ok: false },
      { texto: 'Exportação CSV/Excel',     ok: false },
    ],
  },
  {
    id:          'BASICO' as const,
    nome:        'Básico',
    preco:       'R$ 49',
    periodo:     '/mês',
    descricao:   'Para autônomos e consultores.',
    icone:       <User size={20} />,
    destaque:    false,
    cta:         'Começar trial de 14 dias',
    features: [
      { texto: '5 alertas ativos',         ok: true },
      { texto: '10 palavras-chave',         ok: true },
      { texto: '3 portais monitorados',     ok: true },
      { texto: '50 downloads/mês',          ok: true },
      { texto: 'E-mail + Telegram',         ok: true },
      { texto: 'Push (navegador)',          ok: false },
      { texto: 'Todos os portais',          ok: false },
      { texto: 'Exportação CSV/Excel',      ok: false },
    ],
  },
  {
    id:          'PROFISSIONAL' as const,
    nome:        'Profissional',
    preco:       'R$ 149',
    periodo:     '/mês',
    descricao:   'Para equipes e empresas.',
    icone:       <Zap size={20} />,
    destaque:    true,
    cta:         'Começar trial de 14 dias',
    features: [
      { texto: '30 alertas ativos',         ok: true },
      { texto: '50 palavras-chave',         ok: true },
      { texto: 'Todos os portais',           ok: true },
      { texto: 'Downloads ilimitados',       ok: true },
      { texto: 'E-mail + Telegram + Push',   ok: true },
      { texto: 'Exportação CSV/Excel',       ok: true },
      { texto: 'Relatórios mensais',         ok: true },
      { texto: 'Suporte prioritário',        ok: true },
    ],
  },
  {
    id:          'ENTERPRISE' as const,
    nome:        'Enterprise',
    preco:       'Sob consulta',
    periodo:     '',
    descricao:   'Para grandes operações.',
    icone:       <Building2 size={20} />,
    destaque:    false,
    cta:         'Falar com vendas',
    features: [
      { texto: 'Alertas ilimitados',        ok: true },
      { texto: 'Palavras-chave ilimitadas', ok: true },
      { texto: 'Todos os portais',           ok: true },
      { texto: 'API de integração',          ok: true },
      { texto: 'SLA garantido',             ok: true },
      { texto: 'Onboarding personalizado',   ok: true },
      { texto: 'Gestor de conta dedicado',   ok: true },
      { texto: 'Relatórios customizados',    ok: true },
    ],
  },
]

export default function PlanosPage() {
  return (
    <Suspense>
      <PlanosContent />
    </Suspense>
  )
}

function PlanosContent() {
  const params  = useSearchParams()
  const success = params.get('success') === '1'
  const { token, usuario } = useAuthStore()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function iniciarCheckout(planoId: 'BASICO' | 'PROFISSIONAL') {
    if (!token) {
      window.location.href = `/cadastro?plano=${planoId.toLowerCase()}`
      return
    }

    const priceId = PRICE_IDS[planoId]
    if (!priceId) return

    setLoadingId(planoId)
    try {
      const resp = await fetch(`${API}/v1/stripe/checkout`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId, plano: planoId }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error ?? 'Erro ao iniciar checkout')
      window.location.href = data.url // redireciona para o Stripe Checkout
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto">

      {/* Sucesso pós-checkout */}
      {success && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 animate-fade-in">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">Assinatura ativada com sucesso!</p>
            <p className="text-xs text-emerald-700 mt-0.5">Seu plano já está ativo. Boas licitações!</p>
          </div>
          <Link href="/dashboard" className="ml-auto text-xs font-medium text-emerald-700 hover:underline shrink-0">
            Ir ao dashboard →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Preços</p>
        <h1 className="font-display text-3xl font-700 text-text tracking-tight mb-3">
          Escolha seu plano
        </h1>
        <p className="text-muted text-sm">
          Todos os planos pagos incluem <strong>14 dias de trial gratuito</strong>. Cancele quando quiser.
        </p>
      </div>

      {/* Grid de planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {PLANOS.map((plano) => {
          const isAtual   = usuario?.plano === plano.id
          const loading   = loadingId === plano.id

          return (
            <div
              key={plano.id}
              className={clsx(
                'rounded-2xl border p-6 flex flex-col transition-all',
                plano.destaque
                  ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200 shadow-hover'
                  : 'border-surface-border bg-white hover:border-brand-200 hover:shadow-card'
              )}
            >
              {plano.destaque && (
                <span className="self-start mb-3 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                  Mais popular
                </span>
              )}

              {isAtual && (
                <span className="self-start mb-3 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[10px] font-semibold">
                  Plano atual
                </span>
              )}

              <div className={clsx(
                'inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4',
                plano.destaque ? 'bg-brand-600 text-white' : 'bg-surface-muted text-muted'
              )}>
                {plano.icone}
              </div>

              <h2 className="font-display text-[15px] font-600 text-text">{plano.nome}</h2>
              <div className="flex items-baseline gap-1 mt-2 mb-0.5">
                <span className="font-display text-2xl font-700 text-text">{plano.preco}</span>
                {plano.periodo && <span className="text-xs text-muted">{plano.periodo}</span>}
              </div>
              <p className="text-xs text-muted mb-5 leading-relaxed">{plano.descricao}</p>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plano.features.map((f) => (
                  <li key={f.texto} className="flex items-start gap-2 text-xs">
                    <CheckCircle2
                      size={13}
                      className={clsx('mt-0.5 shrink-0', f.ok ? 'text-brand-500' : 'text-surface-border')}
                    />
                    <span className={f.ok ? 'text-text' : 'text-muted line-through'}>
                      {f.texto}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {plano.id === 'FREE' && (
                <Link
                  href={token ? '/dashboard' : '/cadastro'}
                  className={clsx(
                    'w-full text-center rounded-xl py-2.5 text-sm font-medium transition-all',
                    'border border-surface-border bg-white text-text hover:bg-surface-muted'
                  )}
                >
                  {token ? 'Ir ao dashboard' : 'Começar grátis'}
                </Link>
              )}

              {(plano.id === 'BASICO' || plano.id === 'PROFISSIONAL') && (
                <button
                  onClick={() => iniciarCheckout(plano.id as 'BASICO' | 'PROFISSIONAL')}
                  disabled={loading || isAtual}
                  className={clsx(
                    'w-full rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2',
                    plano.destaque
                      ? 'bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-60'
                      : 'border border-surface-border bg-white text-text hover:bg-surface-muted disabled:opacity-60'
                  )}
                >
                  {loading ? <Spinner /> : isAtual ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
                  {loading ? 'Aguarde…' : isAtual ? 'Plano atual' : plano.cta}
                </button>
              )}

              {plano.id === 'ENTERPRISE' && (
                <a
                  href="mailto:vendas@licitabr.com.br"
                  className="w-full text-center rounded-xl py-2.5 text-sm font-medium border border-surface-border bg-white text-text hover:bg-surface-muted transition-all"
                >
                  {plano.cta}
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ rápido */}
      <div className="card p-8 mb-8">
        <h2 className="font-display text-lg font-600 text-text mb-6 text-center">Perguntas frequentes</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { q: 'Como funciona o trial?', r: 'Todos os planos pagos incluem 14 dias gratuitos. Você não é cobrado até o trial expirar e pode cancelar antes sem nenhum custo.' },
            { q: 'Posso mudar de plano?', r: 'Sim. O upgrade é imediato e com crédito proporcional do valor já pago. O downgrade entra em vigor no próximo ciclo.' },
            { q: 'Quais formas de pagamento?', r: 'Cartão de crédito (Visa, Mastercard, Amex) e boleto bancário, processados de forma segura pelo Stripe.' },
            { q: 'Como cancelo?', r: 'Pelo painel em Configurações → Meu plano → Gerenciar assinatura. O acesso continua até o fim do período já pago.' },
          ].map(({ q, r }) => (
            <div key={q}>
              <p className="text-sm font-medium text-text mb-1">{q}</p>
              <p className="text-xs text-muted leading-relaxed">{r}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Link de retorno */}
      <div className="text-center">
        <Link href={token ? '/dashboard' : '/login'} className="text-sm text-muted hover:text-brand-600 transition-colors">
          ← {token ? 'Voltar ao dashboard' : 'Já tenho uma conta'}
        </Link>
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
