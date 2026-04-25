// apps/web/src/app/(app)/dashboard/page.tsx
'use client'
import { useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Bell, Heart, TrendingUp, Clock, AlertCircle, ExternalLink, Download } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'
import { licitacoesApi, alertasApi, usuarioApi, exportarApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { formatMoedaCompacta, formatDataHora, MODALIDADE_LABEL, situacaoBadgeClass, SITUACAO_LABEL } from '@/lib/format'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

// Dados simulados de gráfico (em produção viria da API)
const graficoDados = [
  { dia: 'Seg', licitacoes: 38 }, { dia: 'Ter', licitacoes: 52 },
  { dia: 'Qua', licitacoes: 61 }, { dia: 'Qui', licitacoes: 47 },
  { dia: 'Sex', licitacoes: 89 }, { dia: 'Sáb', licitacoes: 23 },
  { dia: 'Dom', licitacoes: 14 },
]

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { usuario, setAuth, token } = useAuthStore()
  const params = useSearchParams()

  // Quando a API redireciona após verificar e-mail (?emailVerificado=1),
  // atualiza o store para que o banner desapareça sem precisar de logout/login
  useEffect(() => {
    if (params.get('emailVerificado') === '1' && usuario && !usuario.emailVerificado && token) {
      setAuth({ ...usuario, emailVerificado: true }, token)
      // Remove o parâmetro da URL sem reload
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [params, usuario, setAuth, token])

  const { data: recentes, isLoading: loadingRecentes } = useSWR(
    'dash-recentes',
    () => licitacoesApi.buscar({ situacao: 'ABERTA', sort: 'recentes', limit: 6 }),
    { refreshInterval: 120_000 }
  )
  const { data: alertas } = useSWR('alertas', alertasApi.listar)
  const { data: stats }   = useSWR('usuario-stats', usuarioApi.stats, { revalidateOnFocus: false })

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-8 space-y-8 max-w-6xl">

      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-sm text-muted mb-1">{saudacao},</p>
        <h1 className="font-display text-2xl font-700 text-text tracking-tight">
          {usuario?.nome?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-muted mt-1">
          Aqui está o resumo das licitações do dia.
        </p>
      </div>

      {/* Cards métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <MetricCard
          label="Editais abertos hoje"
          value={recentes?.total?.toLocaleString('pt-BR') ?? '—'}
          icon={<TrendingUp size={18} className="text-brand-600" />}
          bg="bg-brand-50"
        />
        <MetricCard
          label="Alertas ativos"
          value={stats?.alertasAtivos ?? alertas?.filter((a) => a.ativo).length ?? '—'}
          icon={<Bell size={18} className="text-amber-600" />}
          bg="bg-amber-50"
        />
        <MetricCard
          label="Favoritos salvos"
          value={stats?.totalFavoritos ?? '—'}
          icon={<Heart size={18} className="text-rose-500" />}
          bg="bg-rose-50"
        />
        <MetricCard
          label="Notificações enviadas"
          value={stats?.totalNotificacoes ?? '—'}
          icon={<AlertCircle size={18} className="text-blue-600" />}
          bg="bg-blue-50"
          href={usuario?.plano === 'FREE' ? '/planos' : undefined}
          cta={usuario?.plano === 'FREE' ? 'Fazer upgrade →' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Gráfico de atividade */}
        <div className="card p-6 lg:col-span-2 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display text-[15px] font-600 text-text">Atividade semanal</h2>
              <p className="text-xs text-muted mt-0.5">Novos editais publicados por dia</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={graficoDados} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a4731" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1a4731" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#6b6960' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b6960' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e3e1d8', boxShadow: 'none' }}
                formatter={(v: number) => [`${v} editais`, '']}
              />
              <Area type="monotone" dataKey="licitacoes" stroke="#1a4731" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alertas configurados */}
        <div className="card p-5 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-[15px] font-600 text-text">Meus alertas</h2>
            <Link href="/alertas" className="text-xs text-brand-600 hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {!alertas?.length && (
              <div className="text-center py-6">
                <Bell size={24} className="text-muted mx-auto mb-2 opacity-40" />
                <p className="text-xs text-muted">Nenhum alerta configurado.</p>
                <Link href="/alertas/novo" className="text-xs text-brand-600 hover:underline mt-1 block">
                  Criar primeiro alerta
                </Link>
              </div>
            )}
            {alertas?.slice(0, 5).map((alerta) => (
              <div key={alerta.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-muted transition-colors">
                <div className={clsx('h-2 w-2 rounded-full shrink-0', alerta.ativo ? 'bg-emerald-400' : 'bg-gray-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">{alerta.nome}</p>
                  <p className="text-[11px] text-muted truncate">{alerta.palavrasChave.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editais recentes */}
      <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[15px] font-600 text-text">Editais abertos agora</h2>
          <div className="flex items-center gap-2">
            {(usuario?.plano === 'PROFISSIONAL' || usuario?.plano === 'ENTERPRISE') && (
              <a
                href={exportarApi.csv({ situacao: 'ABERTA' })}
                download
                className="btn-ghost text-xs gap-1.5"
                title="Exportar editais abertos como CSV"
              >
                <Download size={13} />
                Exportar CSV
              </a>
            )}
            <Link href="/busca" className="btn-ghost text-xs">
              <Search size={14} />
              Busca completa
            </Link>
          </div>
        </div>

        {loadingRecentes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse-soft space-y-3">
                <div className="h-4 bg-surface-muted rounded w-3/4" />
                <div className="h-3 bg-surface-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentes?.data.slice(0, 6).map((lic) => (
              <Link key={lic.id} href={`/licitacoes/${lic.id}`} className="card-hover p-4 block">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-text leading-snug line-clamp-2 flex-1">{lic.titulo}</p>
                  <span className={situacaoBadgeClass(lic.situacao)}>
                    {SITUACAO_LABEL[lic.situacao]}
                  </span>
                </div>
                <p className="text-xs text-muted mb-3 line-clamp-1">{lic.orgao.razaoSocial}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="tag">{MODALIDADE_LABEL[lic.modalidade]}</span>
                    <span className="tag">{lic.uf}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Clock size={11} />
                    {formatDataHora(lic.dataAbertura)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label, value, icon, bg, href, cta
}: {
  label: string; value: string | number; icon: React.ReactNode
  bg: string; href?: string; cta?: string
}) {
  const content = (
    <div className="card p-4 hover:shadow-hover transition-all">
      <div className={clsx('inline-flex rounded-lg p-2 mb-3', bg)}>{icon}</div>
      <p className="text-2xl font-display font-700 text-text">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
      {cta && <p className="text-xs text-brand-600 font-medium mt-2">{cta}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}
