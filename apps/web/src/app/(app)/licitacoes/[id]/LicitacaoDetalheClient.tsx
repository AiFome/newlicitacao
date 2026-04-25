'use client'
// apps/web/src/app/(app)/licitacoes/[id]/LicitacaoDetalheClient.tsx
import { useLicitacao } from '@/hooks/useLicitacoes'
import { useFavoritos } from '@/hooks/useAlertas'
import {
  formatMoeda, formatDataHora, formatData,
  MODALIDADE_LABEL, PORTAL_LABEL, SITUACAO_LABEL, situacaoBadgeClass
} from '@/lib/format'
import { Heart, Download, ExternalLink, Building2, Calendar, MapPin, Hash, Package, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'

export function LicitacaoDetalheClient({ id }: { id: string }) {
  const { licitacao, isLoading } = useLicitacao(id)
  const { ids: favIds, alternar } = useFavoritos()

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-4xl animate-pulse-soft">
        <div className="h-6 bg-surface-muted rounded w-1/3" />
        <div className="h-10 bg-surface-muted rounded w-2/3" />
        <div className="card p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-surface-muted rounded w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!licitacao) return null

  const isFav = favIds.has(licitacao.id)

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/busca" className="flex items-center gap-1.5 text-sm text-muted hover:text-brand-600 transition-colors">
          <ArrowLeft size={14} /> Voltar à busca
        </Link>
      </div>

      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={situacaoBadgeClass(licitacao.situacao)}>{SITUACAO_LABEL[licitacao.situacao]}</span>
          <span className="tag">{PORTAL_LABEL[licitacao.portalOrigem]}</span>
          <span className="tag">{MODALIDADE_LABEL[licitacao.modalidade]}</span>
        </div>
        <h1 className="font-display text-xl font-700 text-text leading-snug mb-2">{licitacao.titulo}</h1>
        <p className="text-sm text-muted">{licitacao.orgao.razaoSocial}</p>
      </div>

      <div className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <button
          onClick={() => alternar(licitacao.id)}
          className={clsx(
            'btn gap-2',
            isFav
              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
              : 'btn-ghost'
          )}
        >
          <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
          {isFav ? 'Salvo' : 'Salvar'}
        </button>
        <a href={licitacao.linkEdital} target="_blank" rel="noopener noreferrer" className="btn btn-primary gap-2">
          <ExternalLink size={16} />
          Acessar no portal
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        <DataCard icon={<Hash size={15} />}      label="Nº do edital"   value={licitacao.numeroEdital} />
        <DataCard icon={<Building2 size={15} />} label="Valor estimado" value={formatMoeda(licitacao.valorEstimado)} highlight />
        <DataCard icon={<Calendar size={15} />}  label="Abertura"       value={formatDataHora(licitacao.dataAbertura)} />
        <DataCard icon={<MapPin size={15} />}    label="Localização"    value={`${licitacao.municipio ?? '—'} / ${licitacao.uf}`} />
      </div>

      <div className="card p-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="font-display text-[15px] font-600 text-text mb-3">Objeto da licitação</h2>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{licitacao.objeto}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display text-[15px] font-600 text-text mb-4">Cronograma</h2>
          <div className="space-y-3">
            <DataRow label="Publicação"   value={formatData(licitacao.dataPublicacao)} />
            <DataRow label="Abertura"     value={formatDataHora(licitacao.dataAbertura)} />
            <DataRow label="Encerramento" value={formatDataHora(licitacao.dataEncerramento)} />
          </div>
        </div>
        <div className="card p-5 animate-fade-up" style={{ animationDelay: '0.22s' }}>
          <h2 className="font-display text-[15px] font-600 text-text mb-4">Órgão responsável</h2>
          <div className="space-y-3">
            <DataRow label="Nome"   value={licitacao.orgao.razaoSocial} />
            <DataRow label="CNPJ"   value={licitacao.orgao.cnpj} />
            <DataRow label="Esfera" value={licitacao.orgao.esfera} />
            <DataRow label="UF"     value={licitacao.orgao.uf} />
          </div>
        </div>
      </div>

      {licitacao.itens && licitacao.itens.length > 0 && (
        <div className="card animate-fade-up" style={{ animationDelay: '0.25s' }}>
          <div className="flex items-center gap-2 p-5 border-b border-surface-border">
            <Package size={16} className="text-muted" />
            <h2 className="font-display text-[15px] font-600 text-text">Itens ({licitacao.itens.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Descrição</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted">Qtd</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted">Un.</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted">Total</th>
                </tr>
              </thead>
              <tbody>
                {licitacao.itens.map((item) => (
                  <tr key={item.id} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/50">
                    <td className="px-4 py-3 text-text">{item.descricao}</td>
                    <td className="px-4 py-3 text-right text-muted">{item.quantidade}</td>
                    <td className="px-4 py-3 text-muted">{item.unidade}</td>
                    <td className="px-4 py-3 text-right font-medium text-text">{formatMoeda(item.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {licitacao.anexos.length > 0 && (
        <div className="card p-5 animate-fade-up" style={{ animationDelay: '0.28s' }}>
          <h2 className="font-display text-[15px] font-600 text-text mb-4">Documentos ({licitacao.anexos.length})</h2>
          <div className="space-y-2">
            {licitacao.anexos.map((anexo) => (
              <a key={anexo.id} href={anexo.urlStorage ?? '#'} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border border-surface-border hover:border-brand-300 hover:bg-brand-50 transition-all group">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-surface-muted text-muted text-[10px] font-mono font-medium shrink-0">
                  {anexo.tipoArquivo}
                </div>
                <p className="text-sm font-medium text-text group-hover:text-brand-600 transition-colors truncate flex-1">
                  {anexo.nomeArquivo}
                </p>
                <Download size={15} className="text-muted group-hover:text-brand-600 transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DataCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-muted mb-1.5">{icon}<span className="text-xs">{label}</span></div>
      <p className={clsx('text-sm font-medium leading-snug', highlight ? 'text-brand-600' : 'text-text')}>{value}</p>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className="text-sm text-text text-right">{value}</span>
    </div>
  )
}
