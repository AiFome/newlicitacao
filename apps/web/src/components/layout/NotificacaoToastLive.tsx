'use client'
// apps/web/src/components/layout/NotificacaoToastLive.tsx
import { useEffect, useRef } from 'react'
import { useWebSocket, type WsEvento, type LicitacaoWs } from '@/hooks/useWebSocket'
import { formatMoedaCompacta, MODALIDADE_LABEL } from '@/lib/format'
import { Bell, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

/**
 * Componente invisível — monta o WebSocket globalmente no layout do app
 * e dispara toasts nativos do react-hot-toast quando chega nova_licitacao.
 */
export function NotificacaoToastLive() {
  const handleEvento = (evento: WsEvento) => {
    if (evento.tipo !== 'nova_licitacao') return
    mostrarToast(evento.licitacao, evento.alertaNome)
  }

  useWebSocket({ onEvento: handleEvento })

  return null // sem UI própria
}

function mostrarToast(lic: LicitacaoWs, alertaNome: string) {
  toast.custom(
    (t) => (
      <div
        style={{
          opacity:    t.visible ? 1 : 0,
          transform:  t.visible ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'all 0.25s ease',
          width:      '340px',
          background: 'var(--color-background-primary, #fff)',
          border:     '1px solid #e3e1d8',
          borderRadius: '12px',
          padding:    '14px 16px',
          boxShadow:  '0 8px 24px rgba(0,0,0,0.10)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '6px',
              background: '#edf7f1', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bell size={12} color="#1a4731" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#1a4731' }}>
              {alertaNome}
            </span>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6960', padding: '2px' }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Título */}
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary, #1a1a18)', lineHeight: 1.4, marginBottom: '6px' }}>
          {lic.titulo.length > 80 ? lic.titulo.substring(0, 80) + '…' : lic.titulo}
        </p>

        {/* Órgão */}
        <p style={{ fontSize: '11px', color: '#6b6960', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lic.orgao.razaoSocial}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {[
            MODALIDADE_LABEL[lic.modalidade]?.replace('Pregão Eletrônico', 'PE') ?? lic.modalidade,
            lic.uf,
            lic.portalOrigem,
          ].map((tag) => (
            <span key={tag} style={{
              fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
              border: '0.5px solid #e3e1d8', color: '#6b6960', background: '#f5f4f0'
            }}>
              {tag}
            </span>
          ))}
          {lic.valorEstimado && (
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#1a4731' }}>
              {formatMoedaCompacta(lic.valorEstimado)}
            </span>
          )}
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link
            href={`/licitacoes/${lic.id}`}
            onClick={() => toast.dismiss(t.id)}
            style={{
              fontSize: '12px', fontWeight: 500, color: '#fff',
              background: '#1a4731', borderRadius: '7px',
              padding: '5px 12px', textDecoration: 'none', display: 'inline-block'
            }}
          >
            Ver edital
          </Link>
          <a
            href={lic.linkEdital}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '11px', color: '#6b6960', display: 'flex', alignItems: 'center', gap: '3px', textDecoration: 'none' }}
          >
            <ExternalLink size={11} />
            Portal
          </a>
        </div>
      </div>
    ),
    {
      duration: 8_000,
      position: 'top-right',
    }
  )
}
