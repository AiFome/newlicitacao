// apps/web/src/app/(app)/favoritos/page.tsx
'use client'
import { useState } from 'react'
import { Heart, Search, Trash2, ExternalLink } from 'lucide-react'
import { useFavoritos } from '@/hooks/useAlertas'
import {
  formatMoedaCompacta, formatDataHora,
  MODALIDADE_LABEL, PORTAL_LABEL, SITUACAO_LABEL, situacaoBadgeClass
} from '@/lib/format'
import Link from 'next/link'

export default function FavoritosPage() {
  const { favoritos, isLoading, removerById } = useFavoritos()
  const [q, setQ] = useState('')

  const filtrados = favoritos.filter((f) =>
    !q || f.licitacao.titulo.toLowerCase().includes(q.toLowerCase()) ||
    f.licitacao.orgao.razaoSocial.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6 max-w-4xl">

      <div className="animate-fade-up">
        <h1 className="font-display text-2xl font-700 text-text tracking-tight">Minhas Licitações</h1>
        <p className="text-sm text-muted mt-1">Editais que você salvou para acompanhar.</p>
      </div>

      {/* Busca */}
      <div className="relative animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder="Buscar nos favoritos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 h-24 animate-pulse-soft" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card p-12 text-center animate-fade-up">
          <Heart size={36} className="text-muted mx-auto mb-3 opacity-30" />
          <p className="text-muted text-sm">
            {q ? 'Nenhum favorito encontrado.' : 'Você ainda não salvou nenhuma licitação.'}
          </p>
          {!q && (
            <Link href="/busca" className="text-brand-600 text-sm hover:underline mt-1 inline-block">
              Ir para a busca
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted animate-fade-up">{filtrados.length} licitação(ões) salva(s)</p>
          {filtrados.map((fav, i) => {
            const lic = fav.licitacao
            return (
              <div
                key={fav.id}
                className="card-hover p-4 animate-fade-up"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={situacaoBadgeClass(lic.situacao)}>{SITUACAO_LABEL[lic.situacao]}</span>
                      <span className="tag">{PORTAL_LABEL[lic.portalOrigem]}</span>
                      <span className="tag">{lic.uf}</span>
                    </div>
                    <Link href={`/licitacoes/${lic.id}`}>
                      <h3 className="text-sm font-medium text-text hover:text-brand-600 transition-colors line-clamp-2 mb-1">
                        {lic.titulo}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted mb-3">{lic.orgao.razaoSocial}</p>
                    <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                      <span className="tag">{MODALIDADE_LABEL[lic.modalidade]}</span>
                      {lic.valorEstimado && (
                        <span className="font-medium text-text">{formatMoedaCompacta(lic.valorEstimado)}</span>
                      )}
                      <span>Abertura: {formatDataHora(lic.dataAbertura)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a
                      href={lic.linkEdital}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg border border-surface-border text-muted hover:border-brand-400 hover:text-brand-600 transition-all"
                      title="Abrir portal"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => removerById(fav.id)}
                      className="p-1.5 rounded-lg border border-surface-border text-muted hover:border-red-200 hover:text-red-500 transition-all"
                      title="Remover dos favoritos"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
