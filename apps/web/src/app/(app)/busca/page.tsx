// apps/web/src/app/(app)/busca/page.tsx
'use client'
import { useState, useCallback } from 'react'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, Download, Heart } from 'lucide-react'
import { useLicitacoes, type FiltrosLicitacao } from '@/hooks/useLicitacoes'
import { useFavoritos } from '@/hooks/useAlertas'
import { useAuthStore } from '@/lib/auth-store'
import { exportarApi } from '@/lib/api'
import { formatMoedaCompacta, formatDataHora, MODALIDADE_LABEL, PORTAL_LABEL, SITUACAO_LABEL, situacaoBadgeClass } from '@/lib/format'
import Link from 'next/link'
import clsx from 'clsx'
import { UFS } from '@licitabr/shared'

const MODALIDADES = Object.entries(MODALIDADE_LABEL)
const PORTAIS     = Object.entries(PORTAL_LABEL)
const SITUACOES   = Object.entries(SITUACAO_LABEL)

export default function BuscaPage() {
  const [filtros, setFiltros] = useState<FiltrosLicitacao>({
    situacao: 'ABERTA', page: 1, limit: 20, sort: 'recentes',
  })
  const [q, setQ] = useState('')
  const { usuario } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data, isLoading } = useLicitacoes(filtros)
  const { ids: favIds, alternar } = useFavoritos()

  const set = useCallback((key: keyof FiltrosLicitacao, value: unknown) => {
    setFiltros((prev) => ({ ...prev, [key]: value, page: 1 }))
  }, [])

  const toggleMulti = useCallback((key: keyof FiltrosLicitacao, valor: string) => {
    setFiltros((prev) => {
      const atual = (prev[key] as string | undefined) ?? ''
      const lista = atual ? atual.split(',') : []
      const idx   = lista.indexOf(valor)
      const nova  = idx >= 0 ? lista.filter((v) => v !== valor) : [...lista, valor]
      return { ...prev, [key]: nova.join(',') || undefined, page: 1 }
    })
  }, [])

  const isSelected = (key: keyof FiltrosLicitacao, valor: string) =>
    ((filtros[key] as string) ?? '').split(',').includes(valor)

  const limparFiltros = () => setFiltros({ situacao: 'ABERTA', page: 1, limit: 20, sort: 'recentes' })

  const handleBuscar = () => set('q', q || undefined)

  return (
    <div className="flex h-full">

      {/* Sidebar de filtros */}
      <aside className={clsx(
        'border-r border-surface-border bg-white flex-col overflow-y-auto transition-all duration-300',
        sidebarOpen ? 'w-64 flex' : 'w-0 hidden'
      )}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-muted" />
            <span className="text-sm font-medium text-text">Filtros</span>
          </div>
          <button onClick={limparFiltros} className="text-xs text-brand-600 hover:underline">Limpar</button>
        </div>

        <div className="p-4 space-y-6">

          {/* UF */}
          <FilterSection label="Estado (UF)">
            <select
              value={(filtros.uf as string) ?? ''}
              onChange={(e) => set('uf', e.target.value || undefined)}
              className="input text-sm"
            >
              <option value="">Todos os estados</option>
              {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </FilterSection>

          {/* Modalidade */}
          <FilterSection label="Modalidade">
            <div className="flex flex-wrap gap-1.5">
              {MODALIDADES.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => toggleMulti('modalidade', key)}
                  className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                    isSelected('modalidade', key)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-muted border-surface-border hover:border-brand-400 hover:text-brand-600'
                  )}
                >
                  {label.replace('Pregão ', 'PE').replace('Concorrência', 'Conc.').replace('Inexigibilidade', 'Inexig.')}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Portal */}
          <FilterSection label="Portal de origem">
            <div className="space-y-1">
              {PORTAIS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSelected('portal', key)}
                    onChange={() => toggleMulti('portal', key)}
                    className="accent-brand-600 rounded"
                  />
                  <span className="text-sm text-muted group-hover:text-text transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </FilterSection>

          {/* Situação */}
          <FilterSection label="Situação">
            <div className="flex flex-wrap gap-1.5">
              {SITUACOES.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => set('situacao', filtros.situacao === key ? undefined : key)}
                  className={clsx(
                    'rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
                    filtros.situacao === key
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-muted border-surface-border hover:border-brand-400 hover:text-brand-600'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Valor */}
          <FilterSection label="Valor estimado (R$)">
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Mín"
                className="input text-sm"
                onChange={(e) => set('valorMin', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                placeholder="Máx"
                className="input text-sm"
                onChange={(e) => set('valorMax', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </FilterSection>

          {/* Data abertura */}
          <FilterSection label="Abertura — de/até">
            <input type="date" className="input text-sm mb-2"
              onChange={(e) => set('dataAberturaDe', e.target.value || undefined)} />
            <input type="date" className="input text-sm"
              onChange={(e) => set('dataAberturaAte', e.target.value || undefined)} />
          </FilterSection>

        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Barra de busca */}
        <div className="bg-white border-b border-surface-border px-6 py-4">
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setSidebarOpen((p) => !p)}
              className="btn-ghost p-2"
              title={sidebarOpen ? 'Fechar filtros' : 'Abrir filtros'}
            >
              <SlidersHorizontal size={16} />
            </button>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                placeholder="Busque por objeto, órgão, palavras-chave…"
                className="input pl-9 text-sm"
              />
              {q && (
                <button onClick={() => { setQ(''); set('q', undefined) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={handleBuscar} className="btn-primary px-5">Buscar</button>

            <select
              value={filtros.sort ?? 'recentes'}
              onChange={(e) => set('sort', e.target.value)}
              className="input w-48 text-sm"
            >
              <option value="recentes">Mais recentes</option>
              <option value="abertura">Abertura próxima</option>
              <option value="valor_desc">Maior valor</option>
              <option value="valor_asc">Menor valor</option>
            </select>
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Contagem + fonte + exportar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              {isLoading ? 'Buscando…' : (
                <>
                  <span className="font-semibold text-text">{data?.total.toLocaleString('pt-BR') ?? 0}</span> editais encontrados
                  {filtros.q && <> para <em>"{filtros.q}"</em></>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              {data?.fonte === 'elasticsearch' && (
                <span className="text-[10px] font-medium bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full">
                  ⚡ Busca inteligente
                </span>
              )}
              {usuario?.plano === 'PROFISSIONAL' || usuario?.plano === 'ENTERPRISE' ? (
                <a
                  href={exportarApi.csv(filtros as Record<string, string>)}
                  download
                  className="btn-ghost text-xs gap-1.5 py-1.5"
                >
                  <Download size={13} />
                  Exportar CSV
                </a>
              ) : null}
            </div>
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse-soft">
                  <div className="h-4 bg-surface-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {data?.data.map((lic, i) => (
                <div
                  key={lic.id}
                  className="card-hover p-4 animate-fade-up"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={situacaoBadgeClass(lic.situacao)}>{SITUACAO_LABEL[lic.situacao]}</span>
                        <span className="tag">{PORTAL_LABEL[lic.portalOrigem]}</span>
                        <span className="tag">{lic.uf}</span>
                      </div>
                      <Link href={`/licitacoes/${lic.id}`}>
                        <h3 className="text-sm font-medium text-text hover:text-brand-600 transition-colors leading-snug mb-1 line-clamp-2">
                          {lic.titulo}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted line-clamp-1 mb-3">{lic.orgao.razaoSocial}</p>
                      <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                        <span className="tag">{MODALIDADE_LABEL[lic.modalidade]}</span>
                        {lic.valorEstimado && (
                          <span className="font-medium text-text">{formatMoedaCompacta(lic.valorEstimado)}</span>
                        )}
                        <span>Abertura: <span className="text-text">{formatDataHora(lic.dataAbertura)}</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end shrink-0">
                      <button
                        onClick={() => alternar(lic.id)}
                        className={clsx(
                          'p-1.5 rounded-lg border transition-all',
                          favIds.has(lic.id)
                            ? 'bg-rose-50 border-rose-200 text-rose-500'
                            : 'bg-white border-surface-border text-muted hover:border-rose-200 hover:text-rose-400'
                        )}
                        title="Favoritar"
                      >
                        <Heart size={15} fill={favIds.has(lic.id) ? 'currentColor' : 'none'} />
                      </button>
                      {lic.anexos.length > 0 && (
                        <a
                          href={lic.anexos[0]?.urlStorage ?? lic.linkEdital}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-surface-border text-muted hover:border-brand-400 hover:text-brand-600 transition-all"
                          title="Baixar edital"
                        >
                          <Download size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {data?.data.length === 0 && (
                <div className="text-center py-20">
                  <Search size={40} className="text-muted mx-auto mb-4 opacity-30" />
                  <p className="text-muted text-sm">Nenhum edital encontrado com os filtros aplicados.</p>
                  <button onClick={limparFiltros} className="text-brand-600 text-sm hover:underline mt-2">
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Paginação */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => set('page', Math.max(1, (filtros.page ?? 1) - 1))}
                disabled={(filtros.page ?? 1) <= 1}
                className="btn-ghost p-2 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(7, data.totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => set('page', page)}
                    className={clsx(
                      'h-8 w-8 rounded-lg text-sm font-medium transition-all',
                      filtros.page === page
                        ? 'bg-brand-600 text-white'
                        : 'bg-white border border-surface-border text-muted hover:border-brand-400 hover:text-brand-600'
                    )}
                  >
                    {page}
                  </button>
                )
              })}
              {data.totalPages > 7 && <span className="text-muted text-sm">…{data.totalPages}</span>}
              <button
                onClick={() => set('page', Math.min(data.totalPages, (filtros.page ?? 1) + 1))}
                disabled={(filtros.page ?? 1) >= data.totalPages}
                className="btn-ghost p-2 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">{label}</p>
      {children}
    </div>
  )
}
