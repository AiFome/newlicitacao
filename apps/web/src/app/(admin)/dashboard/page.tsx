'use client'
// apps/web/src/app/(admin)/dashboard/page.tsx
import { useState } from 'react'
import useSWR from 'swr'
import { adminApi, type AdminDashboard } from '@/lib/admin-api'
import { formatMoeda, formatDataHora, PORTAL_LABEL } from '@/lib/format'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import {
  Users, FileText, Activity, Bell, TrendingUp,
  DollarSign, AlertTriangle, CheckCircle, XCircle, Clock,
  RefreshCw,
} from 'lucide-react'
import clsx from 'clsx'

const STATUS_COLORS: Record<string, string> = {
  CONCLUIDO: '#10b981', PARCIAL: '#f59e0b',
  FALHOU:    '#ef4444', INICIADO: '#3b82f6',
}
const PLANO_CORES: Record<string, string> = {
  FREE: '#94a3b8', BASICO: '#60a5fa', PROFISSIONAL: '#10b981', ENTERPRISE: '#8b5cf6',
}

function MetricCard({ label, value, sub, icon: Icon, color = 'brand' }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-500 text-muted uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-700 text-text tabular-nums">{value}</p>
          {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
        </div>
        <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', `bg-${color}-50`)}>
          <Icon size={20} className={`text-${color}-600`} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    CONCLUIDO: { label: 'OK',       cls: 'bg-green-50 text-green-700 border-green-200',  icon: CheckCircle },
    PARCIAL:   { label: 'Parcial',  cls: 'bg-amber-50 text-amber-700 border-amber-200',  icon: AlertTriangle },
    FALHOU:    { label: 'Falhou',   cls: 'bg-red-50 text-red-700 border-red-200',        icon: XCircle },
    INICIADO:  { label: 'Rodando',  cls: 'bg-blue-50 text-blue-700 border-blue-200',     icon: Clock },
  }
  const { label, cls, icon: Icon } = map[status] ?? { label: status, cls: 'bg-surface-muted text-muted border-surface-border', icon: Clock }
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[10px] font-600 px-2 py-0.5 rounded-full border', cls)}>
      <Icon size={10} /> {label}
    </span>
  )
}

export default function AdminDashboardPage() {
  const { data, isLoading, mutate } = useSWR<AdminDashboard>('admin-dash', adminApi.dashboard, { refreshInterval: 30_000 })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Visão geral da plataforma em tempo real</p>
        </div>
        <button onClick={() => mutate()} className="btn-ghost text-xs gap-1.5">
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Usuários totais"
          value={data?.usuarios.total.toLocaleString('pt-BR') ?? '—'}
          sub={`+${data?.usuarios.hoje ?? 0} hoje`}
          icon={Users}
        />
        <MetricCard
          label="Licitações"
          value={data?.licitacoes.total.toLocaleString('pt-BR') ?? '—'}
          sub={`+${data?.licitacoes.hoje ?? 0} hoje`}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          label="Alertas ativos"
          value={data?.alertas.ativos.toLocaleString('pt-BR') ?? '—'}
          sub={`${data?.notificacoes.semana ?? 0} notif. esta semana`}
          icon={Bell}
          color="amber"
        />
        <MetricCard
          label="Receita est./mês"
          value={formatMoeda(data?.receita.estimadaMensal ?? 0)}
          sub="baseada em planos ativos"
          icon={DollarSign}
          color="green"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Crescimento de usuários */}
        <div className="card p-5 col-span-2">
          <h2 className="text-sm font-600 text-text mb-4">Novos usuários — últimos 14 dias</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data?.usuarios.crescimento ?? []} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#1a4731" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#1a4731" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="data" tick={{ fontSize: 10, fill: '#9b9b8c' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#9b9b8c' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e2e0d8' }}
                formatter={(v) => [v, 'Usuários']} labelFormatter={(l) => `Dia ${l}`} />
              <Area type="monotone" dataKey="total" stroke="#1a4731" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Usuários por plano */}
        <div className="card p-5">
          <h2 className="text-sm font-600 text-text mb-4">Usuários por plano</h2>
          <div className="space-y-2.5">
            {data && Object.entries(data.usuarios.porPlano)
              .sort(([, a], [, b]) => b - a)
              .map(([plano, count]) => {
                const pct = data.usuarios.total > 0 ? Math.round((count / data.usuarios.total) * 100) : 0
                return (
                  <div key={plano}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-500 text-text">{plano}</span>
                      <span className="text-muted">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: PLANO_CORES[plano] ?? '#94a3b8' }} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Licitações por portal */}
      <div className="card p-5">
        <h2 className="text-sm font-600 text-text mb-4">Licitações coletadas — últimos 30 dias por portal</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={(data?.licitacoes.porPortal ?? []).map((p) => ({ ...p, nome: PORTAL_LABEL[p.portal] ?? p.portal }))}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#9b9b8c' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9b9b8c' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '0.5px solid #e2e0d8' }}
              formatter={(v) => [v, 'Licitações']} />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {(data?.licitacoes.porPortal ?? []).map((_, i) => (
                <Cell key={i} fill={`hsl(${(i * 25) % 360},60%,50%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Logs dos scrapers */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-600 text-text">Últimas execuções dos scrapers</h2>
          <span className={clsx('text-xs font-500 px-2 py-0.5 rounded-full',
            (data?.scrapers.totalErros ?? 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
          )}>
            {data?.scrapers.totalErros ?? 0} erros recentes
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-border">
                {['Portal','Status','Novos','Erros','Duração','Iniciado'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-600 text-muted uppercase tracking-wide py-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.scrapers.ultimosLogs ?? []).slice(0, 15).map((log) => (
                <tr key={log.id} className="border-b border-surface-border/50 hover:bg-surface-muted/50">
                  <td className="py-2 pr-4 font-500 text-text">{PORTAL_LABEL[log.portal] ?? log.portal}</td>
                  <td className="py-2 pr-4"><StatusBadge status={log.status} /></td>
                  <td className="py-2 pr-4 text-green-600 font-500">{log.totalNovos}</td>
                  <td className={clsx('py-2 pr-4 font-500', log.totalErros > 0 ? 'text-red-500' : 'text-muted')}>{log.totalErros}</td>
                  <td className="py-2 pr-4 text-muted">{log.duracao ? `${log.duracao}s` : '—'}</td>
                  <td className="py-2 pr-4 text-muted">{formatDataHora(log.iniciadoEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
