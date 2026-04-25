'use client'
// apps/web/src/app/(admin)/licitacoes/page.tsx
import { useState } from 'react'
import useSWR from 'swr'
import { adminApi } from '@/lib/admin-api'
import { formatMoedaCompacta, formatDataHora, PORTAL_LABEL, MODALIDADE_LABEL, SITUACAO_LABEL, situacaoBadgeClass } from '@/lib/format'
import { Search, RefreshCw, ChevronLeft, ChevronRight, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { UFS } from '@licitabr/shared'

const PORTAIS = [
  'PNCP','COMPRASNET','LICITACOES_E','BLL','BNC','NEGOCIOS_PUBLICOS',
  'LICITANET','PORTAL_COMPRAS_PUBLICAS','LICITARDIGITAL','BBMNET',
  'SOL_LICITACOES','EQUIPLANO','CITACON','LICITACON',
]

export default function AdminLicitacoesPage() {
  const [page, setPage]     = useState(1)
  const [busca, setBusca]   = useState('')
  const [portal, setPortal] = useState('')
  const [uf, setUf]         = useState('')
  const [situacao, setSit]  = useState('')
  const [confirmDel, setCD] = useState<string | null>(null)

  const params: Record<string, string | number> = { page, limit: 20 }
  if (busca)    params['busca']    = busca
  if (portal)   params['portal']  = portal
  if (uf)       params['uf']      = uf
  if (situacao) params['situacao'] = situacao

  const { data, isLoading, mutate } = useSWR(
    ['admin-licitacoes', page, busca, portal, uf, situacao],
    () => adminApi.licitacoes.listar(params),
    { keepPreviousData: true }
  )

  async function reindexar(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await adminApi.licitacoes.reindexar(id)
      toast.success('Reindexação iniciada')
    } catch (err: any) { toast.error(err.message) }
  }

  async function deletar(id: string) {
    try {
      await adminApi.licitacoes.deletar(id)
      toast.success('Licitação removida')
      mutate()
      setCD(null)
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Licitações</h1>
          <p className="text-sm text-muted">{data?.total.toLocaleString('pt-BR') ?? '—'} registros no banco</p>
        </div>
        <button onClick={() => mutate()} className="btn-ghost text-xs gap-1.5">
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1) }}
            placeholder="Buscar por título ou objeto…"
            className="input pl-8 text-sm h-9"
          />
        </div>
        <select value={portal} onChange={(e) => { setPortal(e.target.value); setPage(1) }} className="input text-sm h-9 pr-8">
          <option value="">Todos os portais</option>
          {PORTAIS.map((p) => <option key={p} value={p}>{PORTAL_LABEL[p] ?? p}</option>)}
        </select>
        <select value={uf} onChange={(e) => { setUf(e.target.value); setPage(1) }} className="input text-sm h-9 pr-8">
          <option value="">Todos os estados</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={situacao} onChange={(e) => { setSit(e.target.value); setPage(1) }} className="input text-sm h-9 pr-8">
          <option value="">Todas as situações</option>
          {Object.entries(SITUACAO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/50">
              {['Edital / Órgão','Portal','UF','Valor','Situação','Abertura','Indexado','Favoritos',''].map((h) => (
                <th key={h} className="text-left text-[10px] font-600 text-muted uppercase tracking-wide px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({length:10}).map((_,i) => (
              <tr key={i} className="border-b border-surface-border/50">
                {Array.from({length:9}).map((_,j) => (
                  <td key={j} className="px-4 py-3"><div className="h-3 bg-surface-muted rounded animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.data.map((l) => (
              <tr key={l.id} className="border-b border-surface-border/50 hover:bg-surface-muted/30 group">
                <td className="px-4 py-2.5 max-w-[240px]">
                  <p className="font-500 text-text truncate text-xs">{l.titulo}</p>
                  <p className="text-[10px] text-muted truncate">{l.orgao.razaoSocial} · {l.numeroEdital}</p>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">{PORTAL_LABEL[l.portalOrigem] ?? l.portalOrigem}</td>
                <td className="px-4 py-2.5 text-xs font-500">{l.uf}</td>
                <td className="px-4 py-2.5 text-xs text-muted">{l.valorEstimado ? formatMoedaCompacta(l.valorEstimado) : '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx('text-[10px] font-600 px-2 py-0.5 rounded-full', situacaoBadgeClass(l.situacao))}>
                    {SITUACAO_LABEL[l.situacao] ?? l.situacao}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">{formatDataHora(l.dataAbertura)}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx('text-[10px]', l.indexadoEm ? 'text-green-600' : 'text-red-400')}>
                    {l.indexadoEm ? '✓' : '✗ Pendente'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted">{l._count.favoritos}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/licitacoes/${l.id}`} target="_blank" className="p-1 rounded hover:text-brand-600 text-muted" title="Ver edital">
                      <ExternalLink size={13} />
                    </Link>
                    <button onClick={(e) => reindexar(l.id, e)} className="p-1 rounded hover:text-blue-600 text-muted" title="Reindexar no ES">
                      <RotateCcw size={13} />
                    </button>
                    <button onClick={() => setCD(l.id)} className="p-1 rounded hover:text-red-500 text-muted" title="Remover">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
          <p className="text-xs text-muted">
            {data ? `${((page-1)*20)+1}–${Math.min(page*20,data.total)} de ${data.total.toLocaleString('pt-BR')}` : ''}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p)=>Math.max(1,p-1))} disabled={page===1} className="btn-ghost px-2 py-1 text-xs">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1 text-xs font-500 text-text">{page}/{data?.totalPages??1}</span>
            <button onClick={() => setPage((p)=>p+1)} disabled={page>=(data?.totalPages??1)} className="btn-ghost px-2 py-1 text-xs">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 max-w-sm w-full mx-4 shadow-modal">
            <h3 className="font-display font-700 text-text mb-2">Remover licitação?</h3>
            <p className="text-sm text-muted mb-5">Esta ação remove o registro do banco e do ElasticSearch. Não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setCD(null)} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button onClick={() => deletar(confirmDel)} className="flex-1 justify-center px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-500 hover:bg-red-600 transition-colors">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
