'use client'
// apps/web/src/app/(admin)/scrapers/page.tsx
import { useState } from 'react'
import useSWR from 'swr'
import { adminApi, type ScraperLog } from '@/lib/admin-api'
import { PORTAL_LABEL, formatDataHora } from '@/lib/format'
import {
  Play, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Clock, ChevronLeft, ChevronRight, Terminal,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const PORTAIS_14 = [
  'PNCP','COMPRASNET','LICITACOES_E','BLL','BNC',
  'NEGOCIOS_PUBLICOS','LICITANET','PORTAL_COMPRAS_PUBLICAS',
  'LICITARDIGITAL','BBMNET','SOL_LICITACOES','EQUIPLANO','CITACON','LICITACON',
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    CONCLUIDO: { label: 'Concluído', cls: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle },
    PARCIAL:   { label: 'Parcial',   cls: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
    FALHOU:    { label: 'Falhou',    cls: 'text-red-700 bg-red-50 border-red-200',        icon: XCircle },
    INICIADO:  { label: 'Rodando',   cls: 'text-blue-700 bg-blue-50 border-blue-200',    icon: Clock },
  }
  const cfg = map[status] ?? { label: status, cls: 'text-muted bg-surface-muted border-surface-border', icon: Clock }
  return (
    <span className={clsx('inline-flex items-center gap-1 text-[10px] font-600 px-2 py-0.5 rounded-full border', cfg.cls)}>
      <cfg.icon size={10} /> {cfg.label}
    </span>
  )
}

export default function AdminScrapersPage() {
  const [page, setPage]         = useState(1)
  const [filtroPortal, setFP]   = useState('')
  const [filtroStatus, setFS]   = useState('')
  const [disparando, setDisp]   = useState<string | null>(null)
  const [portalSel, setPortalSel] = useState('PNCP')
  const [paginas, setPaginas]   = useState(5)

  const { data: logs, isLoading, mutate } = useSWR(
    ['admin-scraper-logs', page, filtroPortal, filtroStatus],
    () => adminApi.scrapers.logs({ page, limit: 30, portal: filtroPortal, status: filtroStatus }),
    { refreshInterval: 15_000, keepPreviousData: true }
  )

  const { data: stats } = useSWR('admin-scraper-stats', adminApi.scrapers.stats, { refreshInterval: 30_000 })

  async function disparar() {
    setDisp(portalSel)
    try {
      const res = await adminApi.scrapers.disparar({ portal: portalSel, paginas })
      toast.success(res.message)
      setTimeout(() => mutate(), 3000)
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao disparar')
    } finally {
      setDisp(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Scrapers</h1>
          <p className="text-sm text-muted">Monitoramento e controle dos 14 coletores de portais</p>
        </div>
        <button onClick={() => mutate()} className="btn-ghost text-xs gap-1.5">
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Disparo manual */}
        <div className="card p-5 col-span-1">
          <h2 className="text-sm font-600 text-text mb-4 flex items-center gap-2">
            <Terminal size={14} /> Disparo manual
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-500 text-muted block mb-1">Portal</label>
              <select value={portalSel} onChange={(e) => setPortalSel(e.target.value)} className="input text-sm h-9 w-full">
                {PORTAIS_14.map((p) => (
                  <option key={p} value={p}>{PORTAL_LABEL[p] ?? p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-500 text-muted block mb-1">Páginas a coletar</label>
              <input
                type="number" min={1} max={20} value={paginas}
                onChange={(e) => setPaginas(Number(e.target.value))}
                className="input text-sm h-9 w-full"
              />
            </div>
            <button
              onClick={disparar}
              disabled={!!disparando}
              className="btn-primary w-full justify-center gap-2 text-sm"
            >
              {disparando === portalSel ? (
                <><RefreshCw size={14} className="animate-spin" /> Disparando…</>
              ) : (
                <><Play size={14} /> Iniciar coleta</>
              )}
            </button>
          </div>

          {/* Status por portal */}
          <div className="mt-5 pt-4 border-t border-surface-border">
            <p className="text-[10px] font-600 text-muted uppercase tracking-wide mb-3">Última execução por portal</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {stats?.porPortal?.map((p: any) => (
                <div key={p.portal} className="flex items-center justify-between text-xs">
                  <span className="font-500 text-text">{PORTAL_LABEL[p.portal] ?? p.portal}</span>
                  <div className="flex items-center gap-2 text-muted">
                    <span className="text-green-600">+{p._sum?.totalNovos ?? 0}</span>
                    {(p._sum?.totalErros ?? 0) > 0 && <span className="text-red-500">✗{p._sum.totalErros}</span>}
                    <span>{Math.round(p._avg?.duracao ?? 0)}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="card overflow-hidden col-span-2">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border flex-wrap">
            <select value={filtroPortal} onChange={(e) => { setFP(e.target.value); setPage(1) }} className="input text-xs h-8 pr-6">
              <option value="">Todos os portais</option>
              {PORTAIS_14.map((p) => <option key={p} value={p}>{PORTAL_LABEL[p] ?? p}</option>)}
            </select>
            <select value={filtroStatus} onChange={(e) => { setFS(e.target.value); setPage(1) }} className="input text-xs h-8 pr-6">
              <option value="">Todos os status</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="PARCIAL">Parcial</option>
              <option value="FALHOU">Falhou</option>
              <option value="INICIADO">Rodando</option>
            </select>
            <span className="text-xs text-muted ml-auto">{logs?.total ?? 0} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/50">
                  {['Portal','Status','Novos','Atualizados','Erros','Duração','Iniciado'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-600 text-muted uppercase tracking-wide px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-surface-border/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-surface-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
                {!isLoading && logs?.data.map((log) => (
                  <tr key={log.id} className="border-b border-surface-border/50 hover:bg-surface-muted/30">
                    <td className="px-4 py-2.5 font-500 text-text whitespace-nowrap">
                      {PORTAL_LABEL[log.portal] ?? log.portal}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-2.5 text-green-600 font-500">{log.totalNovos}</td>
                    <td className="px-4 py-2.5 text-blue-600">{log.totalAtualizados}</td>
                    <td className={clsx('px-4 py-2.5 font-500', log.totalErros > 0 ? 'text-red-500' : 'text-muted')}>
                      {log.totalErros}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{log.duracao ? `${log.duracao}s` : '—'}</td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{formatDataHora(log.iniciadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <p className="text-xs text-muted">{logs?.total ?? 0} registros</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1} className="btn-ghost px-2 py-1 text-xs">
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-500 text-text">{page}/{logs?.totalPages ?? 1}</span>
              <button onClick={() => setPage((p)=>p+1)} disabled={page>=(logs?.totalPages??1)} className="btn-ghost px-2 py-1 text-xs">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
