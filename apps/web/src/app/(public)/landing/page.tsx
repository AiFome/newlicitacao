// apps/web/src/app/(public)/landing/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Search, Bell, FileText, Shield, Zap, TrendingUp,
  CheckCircle2, ArrowRight, Building2, Globe, Clock,
  BarChart3, Download, Mail, MessageSquare, Sparkles,
  ChevronRight, Star,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'LicitaBR — Todos os editais públicos do Brasil em um só lugar',
  description: 'Monitore PNCP, BLL, BNC e mais. Alertas em tempo real por e-mail ou Telegram. Planos a partir de R$ 0.',
}

const PORTAIS = [
  'PNCP', 'Comprasnet', 'Licitações-e', 'BLL', 'BNC',
  'Negócios Públicos', 'LicitaNet', 'Portal Compras Públicas',
  'LicitarDigital', 'BBMNet', 'Sol Licitações', 'Equiplano',
  'Citacon', 'LicitaCon',
]

const PLANOS = [
  {
    nome: 'Free',
    preco: 'R$ 0',
    periodo: 'para sempre',
    desc: 'Comece agora sem cartão',
    cor: 'bg-surface-alt border-surface-border',
    cta: 'Criar conta grátis',
    ctaCor: 'btn-secondary',
    features: ['1 portal (PNCP)', '1 alerta', '5 downloads/mês', 'Busca básica'],
  },
  {
    nome: 'Básico',
    preco: 'R$ 49',
    periodo: '/mês',
    desc: 'Para fornecedores ativos',
    cor: 'bg-white border-surface-border',
    cta: 'Assinar Básico',
    ctaCor: 'btn-secondary',
    destaque: false,
    features: ['6 portais principais', '5 alertas', '50 downloads/mês', 'Exportação CSV'],
  },
  {
    nome: 'Profissional',
    preco: 'R$ 149',
    periodo: '/mês',
    desc: 'Para empresas sérias',
    cor: 'bg-brand-700 border-brand-600 text-white',
    cta: 'Assinar Profissional',
    ctaCor: 'btn-primary',
    destaque: true,
    features: ['14 portais (todos)', '30 alertas', 'Downloads ilimitados', 'Exportação Excel + CSV', 'Suporte prioritário'],
  },
  {
    nome: 'Enterprise',
    preco: 'Consulte',
    periodo: '',
    desc: 'Para grandes operações',
    cor: 'bg-white border-surface-border',
    cta: 'Falar com vendas',
    ctaCor: 'btn-secondary',
    features: ['Tudo do Profissional', 'Alertas ilimitados', 'API dedicada', 'SLA garantido', 'Onboarding personalizado'],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* ── Navbar ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl"
        style={{ background: 'rgba(250,249,246,0.85)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--brand-600)' }}>
              <FileText size={16} className="text-white" />
            </div>
            <span className="font-700 text-lg" style={{ color: 'var(--text-strong)', fontFamily: 'var(--font-sans)' }}>
              LicitaBR
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-500" style={{ color: 'var(--muted)' }}>
            <Link href="#como-funciona" className="hover:text-[var(--text)] transition-colors">Como funciona</Link>
            <Link href="#portais"       className="hover:text-[var(--text)] transition-colors">Portais</Link>
            <Link href="#planos"        className="hover:text-[var(--text)] transition-colors">Planos</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login"   className="btn-ghost text-sm px-4 py-2">Entrar</Link>
            <Link href="/cadastro" className="btn-primary text-sm px-4 py-2.5"
              style={{ background: 'var(--brand-600)' }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6">
        {/* Background decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-30"
            style={{ background: 'radial-gradient(ellipse, var(--brand-100) 0%, transparent 70%)' }} />
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, var(--brand-200) 0%, transparent 70%)' }} />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-600 mb-8 animate-fade-in"
            style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', border: '1px solid var(--brand-200)' }}>
            <Sparkles size={12} />
            14 portais monitorados em tempo real
          </div>

          {/* Título */}
          <h1 className="mb-6 animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <span className="block text-5xl md:text-7xl font-300 leading-[1.1] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
              Todos os editais
            </span>
            <span className="block text-5xl md:text-7xl font-300 leading-[1.1] tracking-tight italic"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-600)' }}>
              públicos do Brasil
            </span>
            <span className="block text-5xl md:text-7xl font-300 leading-[1.1] tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
              em um só lugar.
            </span>
          </h1>

          <p className="text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up"
            style={{ color: 'var(--muted)', animationDelay: '0.1s' }}>
            Monitore licitações do PNCP, Comprasnet, BLL, BNC e mais 10 portais.
            Alertas instantâneos por e-mail ou Telegram quando surgir uma oportunidade.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up"
            style={{ animationDelay: '0.15s' }}>
            <Link href="/cadastro"
              className="flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-600 text-white transition-all duration-150 active:scale-[0.97] shadow-brand"
              style={{ background: 'var(--brand-600)' }}>
              Começar grátis agora
              <ArrowRight size={16} />
            </Link>
            <Link href="#como-funciona"
              className="flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-600 transition-all duration-150"
              style={{ color: 'var(--muted)', background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
              Ver como funciona
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-6 text-xs animate-fade-in" style={{ color: 'var(--muted-light)', animationDelay: '0.25s' }}>
            Sem cartão de crédito · Cancele quando quiser · Dados atualizados a cada 2 horas
          </p>
        </div>
      </section>

      {/* ── Portais ──────────────────────────────────── */}
      <section id="portais" className="py-16 px-6 border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="mx-auto max-w-7xl">
          <p className="text-center text-xs font-600 uppercase tracking-widest mb-8"
            style={{ color: 'var(--muted-light)' }}>
            Monitoramos {PORTAIS.length} portais de licitação
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PORTAIS.map((portal, i) => (
              <span key={portal}
                className="rounded-xl px-4 py-2 text-sm font-500 transition-all duration-150 hover:scale-105"
                style={{
                  background: i < 2 ? 'var(--brand-50)' : 'var(--bg-alt)',
                  color:      i < 2 ? 'var(--brand-700)' : 'var(--muted)',
                  border:     `1px solid ${i < 2 ? 'var(--brand-200)' : 'var(--border)'}`,
                }}>
                {portal}
                {i < 2 && <span className="ml-1.5 text-[10px] font-700 opacity-60">OFICIAL</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ─────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-xs font-600 uppercase tracking-widest mb-4" style={{ color: 'var(--brand-500)' }}>
              Como funciona
            </p>
            <h2 className="text-4xl md:text-5xl font-300 tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
              Três passos para nunca<br />
              <span className="italic" style={{ color: 'var(--brand-600)' }}>perder uma licitação</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: '01',
                icon: Bell,
                titulo: 'Configure seus alertas',
                desc: 'Defina palavras-chave, portais, estados e faixas de valor. O sistema monitora tudo automaticamente.',
              },
              {
                num: '02',
                icon: Zap,
                titulo: 'Receba notificações',
                desc: 'Alertas instantâneos por e-mail ou Telegram quando surgir uma licitação que atende seus critérios.',
              },
              {
                num: '03',
                icon: Download,
                titulo: 'Exporte e analise',
                desc: 'Exporte para Excel ou CSV. Salve favoritos, adicione notas e compartilhe com sua equipe.',
              },
            ].map(({ num, icon: Icon, titulo, desc }, i) => (
              <div key={num} className="card p-8 animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-start gap-5 mb-6">
                  <span className="text-5xl font-300 leading-none tabular-nums"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--brand-200)' }}>
                    {num}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl mt-1"
                    style={{ background: 'var(--brand-50)' }}>
                    <Icon size={18} style={{ color: 'var(--brand-600)' }} />
                  </div>
                </div>
                <h3 className="text-lg font-600 mb-2" style={{ color: 'var(--text-strong)' }}>{titulo}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'var(--brand-900)' }}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-300 tracking-tight text-white mb-4"
              style={{ fontFamily: 'var(--font-display)' }}>
              Tudo que você precisa<br />
              <span className="italic" style={{ color: 'var(--brand-300)' }}>para ganhar mais contratos</span>
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Ferramentas profissionais para encontrar, analisar e acompanhar oportunidades.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Search,        titulo: 'Busca inteligente',      desc: 'Filtros por portal, modalidade, UF, valor e data. Busca por palavras-chave no objeto do edital.' },
              { icon: Bell,          titulo: 'Alertas em tempo real',   desc: 'Notificações instantâneas por e-mail ou Telegram. Configure até 30 alertas simultâneos.' },
              { icon: Globe,         titulo: '14 portais integrados',   desc: 'PNCP, Comprasnet, BLL, BNC e mais 10 portais municipais e estaduais. Tudo em um lugar.' },
              { icon: Download,      titulo: 'Exportação completa',     desc: 'Exporte resultados para Excel ou CSV com todos os campos. Pronto para sua planilha de controle.' },
              { icon: Shield,        titulo: 'Dados sempre atualizados',desc: 'Coleta automática a cada 2 horas nos principais portais. Histórico de até 1 ano.' },
              { icon: BarChart3,     titulo: 'Dashboard analítico',     desc: 'Visão geral das oportunidades, alertas disparados e favoritos. Tudo em um painel limpo.' },
            ].map(({ icon: Icon, titulo, desc }, i) => (
              <div key={titulo}
                className="rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] cursor-default animate-fade-up"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  animationDelay: `${i * 0.07}s`,
                }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-4"
                  style={{ background: 'rgba(56,168,118,0.15)' }}>
                  <Icon size={18} style={{ color: 'var(--brand-300)' }} />
                </div>
                <h3 className="font-600 text-white mb-2">{titulo}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ───────────────────────────────────── */}
      <section id="planos" className="py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <p className="text-xs font-600 uppercase tracking-widest mb-4" style={{ color: 'var(--brand-500)' }}>
              Planos e preços
            </p>
            <h2 className="text-4xl md:text-5xl font-300 tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
              Simples e transparente
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PLANOS.map((plano, i) => (
              <div key={plano.nome}
                className={`rounded-2xl p-6 border flex flex-col animate-fade-up ${plano.cor}`}
                style={{ animationDelay: `${i * 0.08}s` }}>
                {plano.destaque && (
                  <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-700 uppercase tracking-widest mb-4 self-start"
                    style={{ background: 'var(--brand-500)', color: 'white' }}>
                    <Star size={9} fill="white" /> Mais popular
                  </div>
                )}
                <p className={`text-xs font-600 uppercase tracking-widest mb-1 ${plano.destaque ? 'text-white/60' : ''}`}
                  style={!plano.destaque ? { color: 'var(--muted)' } : {}}>
                  {plano.nome}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-3xl font-700 ${plano.destaque ? 'text-white' : ''}`}
                    style={!plano.destaque ? { color: 'var(--text-strong)' } : {}}>
                    {plano.preco}
                  </span>
                  <span className={`text-sm ${plano.destaque ? 'text-white/50' : ''}`}
                    style={!plano.destaque ? { color: 'var(--muted)' } : {}}>
                    {plano.periodo}
                  </span>
                </div>
                <p className={`text-sm mb-6 ${plano.destaque ? 'text-white/60' : ''}`}
                  style={!plano.destaque ? { color: 'var(--muted)' } : {}}>
                  {plano.desc}
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plano.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className={plano.destaque ? 'text-brand-300' : ''} style={!plano.destaque ? { color: 'var(--brand-500)' } : {}} />
                      <span className={plano.destaque ? 'text-white/80' : ''} style={!plano.destaque ? { color: 'var(--muted)' } : {}}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro"
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-600 transition-all duration-150 active:scale-[0.97] ${plano.destaque ? 'text-brand-700' : ''}`}
                  style={plano.destaque
                    ? { background: 'white' }
                    : { background: 'var(--bg-alt)', color: 'var(--text)', border: '1px solid var(--border)' }
                  }>
                  {plano.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'var(--brand-50)', borderTop: '1px solid var(--brand-100)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-300 tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-strong)' }}>
            Comece agora.<br />
            <span className="italic" style={{ color: 'var(--brand-600)' }}>É grátis para sempre.</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: 'var(--muted)' }}>
            Crie sua conta em 30 segundos e comece a monitorar o PNCP sem pagar nada.
          </p>
          <Link href="/cadastro"
            className="inline-flex items-center gap-2.5 rounded-xl px-8 py-4 text-base font-600 text-white transition-all duration-150 active:scale-[0.97]"
            style={{ background: 'var(--brand-600)', boxShadow: '0 4px 20px rgba(22,107,69,0.3)' }}>
            Criar conta grátis
            <ArrowRight size={18} />
          </Link>
          <p className="mt-4 text-sm" style={{ color: 'var(--muted-light)' }}>
            Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="py-12 px-6 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--brand-600)' }}>
              <FileText size={13} className="text-white" />
            </div>
            <span className="font-600 text-sm" style={{ color: 'var(--text)' }}>LicitaBR</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/termos"      className="hover:text-[var(--text)] transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-[var(--text)] transition-colors">Privacidade</Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted-light)' }}>
            © {new Date().getFullYear()} LicitaBR. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  )
}
