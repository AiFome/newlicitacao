'use client'
// apps/web/src/app/(admin)/sistema/page.tsx
import useSWR from 'swr'
import { adminApi } from '@/lib/admin-api'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Server, Cpu, Database, Zap } from 'lucide-react'
import clsx from 'clsx'

function ServiceCard({ name, status, ms, erro }: {
  name: string; status: 'ok' | 'fail'; ms?: number; erro?: string
}) {
  const Icon = status === 'ok' ? CheckCircle : XCircle
  return (
    <div className={clsx('card p-4 flex items-start gap-3 border',
      status === 'ok' ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'
    )}>
      <Icon size={18} className={status === 'ok' ? 'text-green-600 mt-0.5 shrink-0' : 'text-red-500 mt-0.5 shrink-0'} />
      <div className="flex-1 min-w-0">
        <p className="font-600 text-text text-sm">{name}</p>
        {status === 'ok' && ms !== undefined && (
          <p className="text-xs text-muted">{ms}ms de latência</p>
        )}
        {erro && <p className="text-xs text-red-500 truncate">{erro}</p>}
      </div>
      <span className={clsx('text-[10px] font-700 px-2 py-0.5 rounded-full',
        status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      )}>
        {status === 'ok' ? 'ONLINE' : 'FALHOU'}
      </span>
    </div>
  )
}

function ConfigRow({ label, value, sensitive = false }: { label: string; value: string; sensitive?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-surface-border/50 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={clsx('text-sm font-500', sensitive && 'font-mono text-xs')}>
        {sensitive ? (value ? '●●●●●●●●' : <span className="text-red-400">não configurado</span>) : value}
      </span>
    </div>
  )
}

export default function AdminSistemaPage() {
  const { data: saude, isLoading: loadS, mutate: mutS, error: errS } = useSWR(
    'admin-saude', adminApi.sistema.saude, { refreshInterval: 30_000 }
  )
  const { data: config, isLoading: loadC } = useSWR('admin-config', adminApi.sistema.config)

  const checks = saude?.checks ?? {}

  function formatUptime(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Sistema</h1>
          <p className="text-sm text-muted">Saúde dos serviços e configurações da plataforma</p>
        </div>
        <button onClick={() => mutS()} className="btn-ghost text-xs gap-1.5">
          <RefreshCw size={13} className={loadS ? 'animate-spin' : ''} /> Verificar
        </button>
      </div>

      {/* Saúde dos serviços */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-600 text-text">Status dos serviços</h2>
          {saude && (
            <span className={clsx('text-[10px] font-700 px-2 py-0.5 rounded-full',
              saude.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}>
              {saude.ok ? 'Todos operacionais' : 'Problemas detectados'}
            </span>
          )}
        </div>

        {errS && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-3">
            <AlertCircle size={16} /> Não foi possível verificar o status dos serviços.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ServiceCard
            name="PostgreSQL"
            status={checks['postgres']?.ok ? 'ok' : 'fail'}
            ms={checks['postgres']?.ms}
            erro={checks['postgres']?.erro}
          />
          <ServiceCard
            name="Redis"
            status={checks['redis']?.ok ? 'ok' : 'fail'}
            ms={checks['redis']?.ms}
            erro={checks['redis']?.erro}
          />
          <ServiceCard
            name="ElasticSearch"
            status={checks['elasticsearch']?.ok ? 'ok' : 'fail'}
            ms={checks['elasticsearch']?.ms}
            erro={checks['elasticsearch']?.erro}
          />
        </div>
      </div>

      {/* Recursos do servidor */}
      {config && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4 flex items-start gap-3">
            <Server size={16} className="text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted">Node.js</p>
              <p className="font-600 text-text">{config.nodeVersion}</p>
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3">
            <Cpu size={16} className="text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted">Memória heap</p>
              <p className="font-600 text-text">{config.memoryMB} MB</p>
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3">
            <Zap size={16} className="text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted">Uptime da API</p>
              <p className="font-600 text-text">{formatUptime(config.uptime)}</p>
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3">
            <Database size={16} className="text-muted mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted">Índice ES</p>
              <p className="font-600 text-text font-mono text-xs">{config.esIndexName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Configurações e integrações */}
      {config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="text-sm font-600 text-text mb-4">Ambiente</h2>
            <ConfigRow label="NODE_ENV"            value={config.nodeEnv} />
            <ConfigRow label="Scraper concurrency" value={String(config.scraperConcur)} />
            <ConfigRow label="ES index"            value={config.esIndexName} />
          </div>
          <div className="card p-5">
            <h2 className="text-sm font-600 text-text mb-4">Integrações</h2>
            <ConfigRow label="SendGrid (e-mail)"    value={config.sendgrid ? '✓ Configurado' : '✗'} sensitive={!config.sendgrid} />
            <ConfigRow label="Telegram Bot"         value={config.telegramBot ? '✓ Configurado' : '✗'} sensitive={!config.telegramBot} />
            <ConfigRow label="Stripe"               value={config.stripe ? '✓ Configurado' : '✗'} sensitive={!config.stripe} />
            <ConfigRow label="Sentry"               value={config.sentry ? '✓ Configurado' : '✗'} sensitive={!config.sentry} />
          </div>
        </div>
      )}

      {(loadC) && (
        <div className="card p-6 text-center text-sm text-muted">Carregando configurações…</div>
      )}

      {/* Ações de manutenção */}
      <div className="card p-5">
        <h2 className="text-sm font-600 text-text mb-4">Manutenção</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-surface-border p-4">
            <p className="font-600 text-text mb-1">Reiniciar cache Redis</p>
            <p className="text-xs text-muted mb-3">Limpa o cache de buscas e rate limits. Usuários não são deslogados.</p>
            <a
              href="/admin/scrapers"
              className="btn-ghost text-xs gap-1.5"
            >
              Ir para Scrapers para forçar reindexação
            </a>
          </div>
          <div className="rounded-lg border border-surface-border p-4">
            <p className="font-600 text-text mb-1">Documentação da API</p>
            <p className="text-xs text-muted mb-3">Swagger UI com todos os endpoints disponíveis para desenvolvedores.</p>
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/docs`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs gap-1.5 inline-flex items-center"
            >
              Abrir Swagger UI →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
