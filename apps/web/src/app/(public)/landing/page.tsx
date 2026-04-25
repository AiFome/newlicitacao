// apps/web/src/app/(public)/landing/page.tsx
// Rota: / (configurada no next.config via redirect ou usada como index)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LicitaBR — Todos os editais públicos do Brasil em um só lugar',
  description: 'Monitore PNCP, BLL, BNC e mais. Alertas em tempo real por e-mail ou Telegram. Planos a partir de R$ 0.',
  openGraph: {
    title:       'LicitaBR — Monitoramento de Licitações Públicas',
    description: 'Todos os editais públicos do Brasil. Alertas em tempo real, busca inteligente e exportação CSV.',
    url:         'https://licitabr.com.br/landing',
    type:        'website',
    locale:      'pt_BR',
  },
  twitter: { card: 'summary_large_image', title: 'LicitaBR', description: 'Monitoramento de licitações públicas brasileiras.' },
  alternates: { canonical: 'https://licitabr.com.br/landing' },
}

import Link from 'next/link'
import {
  Search, Bell, FileText, Shield, Zap, TrendingUp,
  CheckCircle2, ArrowRight, Building2, Globe, Clock,
  BarChart3, Download, Mail, MessageSquare,
} from 'lucide-react'

// ── Dados estáticos ─────────────────────────────────────
const PORTAIS = [
  { nome: 'PNCP',                    tipo: 'API oficial',  destaque: true  },
  { nome: 'Comprasnet',              tipo: 'Federal',      destaque: true  },
  { nome: 'Licitações-e',            tipo: 'Banco do Brasil', destaque: false },
  { nome: 'BLL',                     tipo: 'Nacional',     destaque: false },
  { nome: 'BNC',                     tipo: 'Nacional',     destaque: false },
  { nome: 'Negócios Públicos',       tipo: 'Nacional',     destaque: false },
  { nome: 'LicitaNet',               tipo: 'Municipal',    destaque: false },
  { nome: 'Portal Compras Públicas', tipo: 'Municipal',    destaque: false },
  { nome: 'LicitarDigital',          tipo: 'Municipal',    destaque: false },
  { nome: 'BBMNet',                  tipo: 'Municipal',    destaque: false },
  { nome: 'Sol Licitações',          tipo: 'SC/RS/PR',     destaque: false },
  { nome: 'Equiplano',               tipo: 'SP interior',  destaque: false },
  { nome: 'Citacon',                 tipo: 'RS',           destaque: false },
  { nome: 'LicitaCon',               tipo: 'Câmaras SP',   destaque: false },
]

const DEPOIMENTOS = [
  {
    texto: 'Configurei um alerta para licitações de TI em SP e em 2 dias já tinha 12 novos editais na caixa de entrada. Economizo 3 horas por semana.',
    nome: 'Rafael C.',
    cargo: 'Consultor de licitações · São Paulo',
    iniciais: 'RC',
  },
  {
    texto: 'A busca unificada é o que mais uso. Antes precisava entrar em 5 portais diferentes todo dia. Agora é tudo num lugar só.',
    nome: 'Patrícia M.',
    cargo: 'Gestora pública · Belo Horizonte',
    iniciais: 'PM',
  },
  {
    texto: 'O alerta por Telegram chegou 2 horas antes do concorrente ver o edital. Ganhamos a licitação com proposta muito mais preparada.',
    nome: 'Carlos F.',
    cargo: 'Diretor comercial · Rio de Janeiro',
    iniciais: 'CF',
  },
]

const PLANOS = [
  {
    nome: 'Gratuito',
    preco: 'R$ 0',
    periodo: 'para sempre',
    descricao: 'Para conhecer a plataforma.',
    destaque: false,
    cta: 'Começar grátis',
    href: '/cadastro',
    features: [
      '1 alerta ativo',
      '3 palavras-chave por alerta',
      'Apenas PNCP',
      '5 downloads/mês',
      'Alertas por e-mail',
    ],
  },
  {
    nome: 'Básico',
    preco: 'R$ 49',
    periodo: '/mês',
    descricao: 'Para profissionais autônomos.',
    destaque: false,
    cta: 'Começar trial de 14 dias',
    href: '/cadastro?plano=basico',
    features: [
      '5 alertas ativos',
      '10 palavras-chave por alerta',
      '3 portais monitorados',
      '50 downloads/mês',
      'E-mail + Telegram',
    ],
  },
  {
    nome: 'Profissional',
    preco: 'R$ 149',
    periodo: '/mês',
    descricao: 'Para equipes e empresas.',
    destaque: true,
    cta: 'Começar trial de 14 dias',
    href: '/cadastro?plano=profissional',
    features: [
      '30 alertas ativos',
      '50 palavras-chave por alerta',
      'Todos os portais',
      'Downloads ilimitados',
      'E-mail + Telegram + Push',
      'Exportação CSV/Excel',
    ],
  },
  {
    nome: 'Enterprise',
    preco: 'Sob consulta',
    periodo: '',
    descricao: 'Para grandes operações.',
    destaque: false,
    cta: 'Falar com vendas',
    href: 'mailto:vendas@licitabr.com.br',
    features: [
      'Alertas ilimitados',
      'Palavras-chave ilimitadas',
      'Todos os portais',
      'API de integração',
      'SLA e suporte dedicado',
      'Onboarding personalizado',
    ],
  },
]

// ── Componentes reutilizáveis ────────────────────────────
function FeatureCard({
  icon, title, desc,
}: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-6 hover:shadow-hover hover:border-brand-200 transition-all">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="font-display text-[15px] font-600 text-text mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  )
}

function StarRating() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="14" height="14" fill="#f59e0b" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ── Página ───────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="w-full">

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-24 px-6 text-center">
        {/* Fundo sutil pontilhado */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, #1a4731 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-soft" />
            +1.200 editais novos por dia
          </span>

          <h1 className="font-display text-5xl font-800 text-text leading-[1.1] tracking-tight mb-6">
            Todos os editais
            <span className="block text-brand-600">públicos do Brasil.</span>
            <span className="block">Em um só lugar.</span>
          </h1>

          <p className="text-lg text-muted leading-relaxed mb-10 max-w-xl mx-auto">
            Monitore PNCP, Comprasnet, BLL, BNC e mais. Receba alertas em tempo real
            por e-mail ou Telegram quando um edital novo bater nas suas palavras-chave.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
            >
              Começar grátis agora
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-6 py-3 text-sm font-medium text-text hover:bg-surface-muted transition-colors"
            >
              Já tenho conta
            </Link>
          </div>

          <p className="text-xs text-muted mt-4">
            Sem cartão de crédito · Trial de 14 dias · Cancele quando quiser
          </p>
        </div>

        {/* Preview do dashboard */}
        <div className="relative max-w-4xl mx-auto mt-16">
          <div className="rounded-2xl border border-surface-border bg-white shadow-modal overflow-hidden">
            {/* Barra de título do app */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border bg-surface-muted">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="rounded-md bg-white border border-surface-border px-3 py-0.5 text-xs text-muted">
                  app.licitabr.com.br/busca
                </div>
              </div>
            </div>
            {/* Conteúdo mockado */}
            <div className="flex h-64 text-left">
              {/* Sidebar mockada */}
              <div className="w-48 border-r border-surface-border p-4 space-y-1 shrink-0">
                {['Dashboard', 'Buscar Editais', 'Minhas Licitações', 'Alertas'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${i === 1 ? 'bg-brand-50 text-brand-700 font-medium' : 'text-muted'}`}
                  >
                    <div className={`h-3 w-3 rounded-sm ${i === 1 ? 'bg-brand-400' : 'bg-surface-border'}`} />
                    {item}
                  </div>
                ))}
              </div>
              {/* Área principal mockada */}
              <div className="flex-1 p-4 space-y-3 overflow-hidden">
                <div className="flex gap-2">
                  <div className="flex-1 h-8 rounded-lg bg-surface-muted border border-surface-border" />
                  <div className="w-20 h-8 rounded-lg bg-brand-600" />
                </div>
                {[
                  { badge: 'Aberta', w1: '65%', w2: '40%', tag1: 'Pregão', tag2: 'SP' },
                  { badge: 'Aberta', w1: '80%', w2: '55%', tag1: 'Concorrência', tag2: 'MG' },
                  { badge: 'Aberta', w1: '50%', w2: '35%', tag1: 'Pregão', tag2: 'RJ' },
                ].map((row, i) => (
                  <div key={i} className="rounded-xl border border-surface-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">{row.badge}</div>
                      <div className={`h-2.5 rounded bg-surface-muted`} style={{ width: row.w1 }} />
                    </div>
                    <div className={`h-2 rounded bg-surface-muted`} style={{ width: row.w2 }} />
                    <div className="flex gap-1.5">
                      {[row.tag1, row.tag2].map((t) => (
                        <span key={t} className="text-[10px] border border-surface-border rounded px-1.5 py-0.5 text-muted">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────── */}
      <section className="py-14 px-6 border-y border-surface-border bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { valor: '+1.200',   label: 'editais por dia' },
            { valor: '8',        label: 'portais integrados' },
            { valor: '< 2h',     label: 'tempo de atualização' },
            { valor: '100%',     label: 'LGPD e dados seguros' },
          ].map(({ valor, label }) => (
            <div key={label}>
              <p className="font-display text-3xl font-700 text-brand-600">{valor}</p>
              <p className="text-sm text-muted mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Funcionalidades</p>
            <h2 className="font-display text-3xl font-700 text-text tracking-tight mb-4">
              Tudo que você precisa para monitorar licitações
            </h2>
            <p className="text-muted max-w-xl mx-auto text-sm leading-relaxed">
              Do alerta até o download do edital, sem precisar entrar em nenhum portal manualmente.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard icon={<Search size={20} />}     title="Busca unificada"        desc="Pesquise por objeto, órgão ou palavras-chave em todos os portais ao mesmo tempo com filtros avançados." />
            <FeatureCard icon={<Bell size={20} />}       title="Alertas em tempo real"   desc="Configure palavras-chave e seja notificado por e-mail ou Telegram assim que um edital for publicado." />
            <FeatureCard icon={<Download size={20} />}   title="Download de editais"     desc="Baixe PDFs e anexos diretamente na plataforma, sem precisar acessar cada portal individualmente." />
            <FeatureCard icon={<Globe size={20} />}      title="8 portais integrados"    desc="PNCP, Comprasnet, BLL, BNC, LicitaNet e mais. Novos portais são adicionados regularmente." />
            <FeatureCard icon={<BarChart3 size={20} />}  title="Dashboard de gestão"     desc="Acompanhe o status de cada licitação, salve favoritos e organize seus editais com notas e tags." />
            <FeatureCard icon={<Shield size={20} />}     title="Seguro e confiável"      desc="Dados atualizados a cada 2 horas diretamente das fontes oficiais. Conformidade com a LGPD." />
          </div>
        </div>
      </section>

      {/* ── PORTAIS ────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white border-y border-surface-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Integrações</p>
            <h2 className="font-display text-2xl font-700 text-text tracking-tight">
              Portais monitorados
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PORTAIS.map(({ nome, tipo, destaque }) => (
              <div
                key={nome}
                className={`rounded-xl border p-4 text-center transition-all ${
                  destaque
                    ? 'border-brand-300 bg-brand-50'
                    : tipo === 'Em breve'
                    ? 'border-surface-border bg-surface-muted opacity-60'
                    : 'border-surface-border bg-white hover:border-brand-200'
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold mx-auto mb-2">
                  {nome.charAt(0)}
                </div>
                <p className="text-xs font-semibold text-text">{nome}</p>
                <p className={`text-[10px] mt-0.5 ${destaque ? 'text-brand-600 font-medium' : 'text-muted'}`}>{tipo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ───────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Fluxo</p>
            <h2 className="font-display text-2xl font-700 text-text tracking-tight">
              Três passos para nunca perder um edital
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: '01', icon: <Zap size={22} />,       title: 'Crie sua conta',       desc: 'Cadastre-se gratuitamente em menos de 2 minutos. Sem cartão de crédito.' },
              { num: '02', icon: <Bell size={22} />,       title: 'Configure alertas',    desc: 'Defina palavras-chave, portais e regiões. Escolha e-mail ou Telegram.' },
              { num: '03', icon: <TrendingUp size={22} />, title: 'Receba as licitações', desc: 'Os editais chegam pra você em tempo real. Baixe e participe.' },
            ].map(({ num, icon, title, desc }) => (
              <div key={num} className="text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white mb-4">
                  {icon}
                </div>
                <div className="text-xs font-bold text-brand-400 mb-1">{num}</div>
                <h3 className="font-display text-[15px] font-600 text-text mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ────────────────────────────────── */}
      <section className="py-16 px-6 bg-white border-y border-surface-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Depoimentos</p>
            <h2 className="font-display text-2xl font-700 text-text tracking-tight">
              Quem usa, recomenda
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {DEPOIMENTOS.map(({ texto, nome, cargo, iniciais }) => (
              <div key={nome} className="rounded-2xl border border-surface-border bg-surface-muted p-6">
                <StarRating />
                <p className="text-sm text-text leading-relaxed mt-3 mb-4 italic">"{texto}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-brand-200 flex items-center justify-center text-brand-700 text-xs font-semibold shrink-0">
                    {iniciais}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text">{nome}</p>
                    <p className="text-[11px] text-muted">{cargo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANOS ─────────────────────────────────────── */}
      <section className="py-20 px-6" id="planos">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-3">Preços</p>
            <h2 className="font-display text-3xl font-700 text-text tracking-tight mb-3">
              Simples e transparente
            </h2>
            <p className="text-muted text-sm">Todos os planos incluem 14 dias de trial gratuito. Cancele quando quiser.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {PLANOS.map((plano) => (
              <div
                key={plano.nome}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plano.destaque
                    ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                    : 'border-surface-border bg-white'
                }`}
              >
                {plano.destaque && (
                  <span className="inline-block mb-3 self-start rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-[15px] font-600 text-text">{plano.nome}</h3>
                <div className="mt-2 mb-1 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-700 text-text">{plano.preco}</span>
                  {plano.periodo && <span className="text-xs text-muted">{plano.periodo}</span>}
                </div>
                <p className="text-xs text-muted mb-5">{plano.descricao}</p>

                <ul className="space-y-2 flex-1 mb-6">
                  {plano.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text">
                      <CheckCircle2 size={13} className="text-brand-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plano.href}
                  className={`w-full text-center rounded-xl py-2.5 text-sm font-medium transition-all ${
                    plano.destaque
                      ? 'bg-brand-600 text-white hover:bg-brand-500'
                      : 'border border-surface-border bg-white text-text hover:bg-surface-muted'
                  }`}
                >
                  {plano.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────── */}
      <section className="py-20 px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-700 text-white tracking-tight mb-4">
            Comece a monitorar hoje mesmo.
          </h2>
          <p className="text-brand-200 text-sm leading-relaxed mb-8">
            Crie sua conta gratuita em 2 minutos e configure seu primeiro alerta agora.
            Nenhum cartão de crédito necessário.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
            >
              Criar conta gratuita
              <ArrowRight size={16} />
            </Link>
            <Link
              href="mailto:contato@licitabr.com.br"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-400 px-6 py-3 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
            >
              <Mail size={15} />
              Falar com a equipe
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="py-12 px-6 bg-white border-t border-surface-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-brand-600 flex items-center justify-center">
                  <FileText size={14} className="text-white" />
                </div>
                <span className="font-display text-sm font-700 text-text">LicitaBR</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Plataforma de monitoramento de licitações públicas brasileiras.
              </p>
            </div>
            {[
              { titulo: 'Produto', links: ['Busca de editais', 'Alertas', 'Dashboard', 'Planos e preços'] },
              { titulo: 'Portais', links: ['PNCP', 'Comprasnet', 'BLL / BNC', 'LicitaNet'] },
              { titulo: 'Empresa',  links: ['Sobre nós', 'Blog', 'Privacidade', 'Termos de uso'] },
            ].map(({ titulo, links }) => (
              <div key={titulo}>
                <p className="text-xs font-semibold text-text mb-3">{titulo}</p>
                <ul className="space-y-2">
                  {links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-xs text-muted hover:text-brand-600 transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-surface-border pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted">
              © {new Date().getFullYear()} LicitaBR. Todos os direitos reservados.
            </p>
            <p className="text-xs text-muted">
              Dados coletados diretamente dos portais oficiais de licitação do Brasil.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
