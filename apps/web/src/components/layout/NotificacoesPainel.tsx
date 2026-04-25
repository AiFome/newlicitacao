'use client'
// apps/web/src/components/layout/NotificacoesPainel.tsx
import { useState, useRef, useEffect } from 'react'
import { Bell, X, ExternalLink, Wifi, WifiOff, Clock } from 'lucide-react'
import { useNotificacoes, type NotificacaoToast } from '@/hooks/useWebSocket'
import { formatMoedaCompacta, MODALIDADE_LABEL, PORTAL_LABEL } from '@/lib/format'
import Link from 'next/link'
import clsx from 'clsx'

export function NotificacoesPainel() {
  const [aberto, setAberto] = useState(false)
  const painelRef = useRef<HTMLDivElement>(null)
  const { notificacoes, naoVistas, status, marcarTodasVistas, remover } = useNotificacoes()

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggleAberto() {
    setAberto((p) => {
      if (!p) marcarTodasVistas()
      return !p
    })
  }

  const statusInfo = {
    conectado:    { cor: 'bg-emerald-400', label: 'Tempo real ativo' },
    conectando:   { cor: 'bg-amber-400 animate-pulse', label: 'Conectando…' },
    desconectado: { cor: 'bg-gray-300', label: 'Offline' },
    erro:         { cor: 'bg-red-400', label: 'Erro de conexão' },
  }[status]

  return (
    <div className="relative" ref={painelRef}>

      {/* Botão do sino */}
      <button
        onClick={toggleAberto}
        className={clsx(
          'relative flex h-9 w-9 items-center justify-center rounded-lg border transition-all',
          aberto
            ? 'border-brand-300 bg-brand-50 text-brand-600'
            : 'border-surface-border bg-white text-muted hover:text-text hover:border-brand-200'
        )}
        title="Notificações"
      >
        <Bell size={17} />
        {naoVistas > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">
            {naoVistas > 9 ? '9+' : naoVistas}
          </span>
        )}
      </button>

      {/* Painel dropdown */}
      {aberto && (
        <div className="absolute right-0 top-11 w-96 card shadow-modal z-50 animate-fade-up overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text">Notificações</span>
              <div className="flex items-center gap-1.5">
                <span className={clsx('h-1.5 w-1.5 rounded-full', statusInfo.cor)} />
                <span className="text-[11px] text-muted">{statusInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notificacoes.length > 0 && (
                <button
                  onClick={marcarTodasVistas}
                  className="text-[11px] text-brand-600 hover:underline"
                >
                  Marcar todas como vistas
                </button>
              )}
              <button onClick={() => setAberto(false)} className="text-muted hover:text-text">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[420px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                {status === 'conectado' ? (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 mb-3">
                      <Wifi size={22} className="text-brand-400" />
                    </div>
                    <p className="text-sm font-medium text-text mb-1">Tudo em dia</p>
                    <p className="text-xs text-muted leading-relaxed">
                      Monitorando seus alertas em tempo real.<br />
                      Novos editais aparecerão aqui.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted mb-3">
                      <WifiOff size={22} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-text mb-1">
                      {status === 'conectando' ? 'Conectando…' : 'Sem conexão'}
                    </p>
                    <p className="text-xs text-muted">
                      As notificações chegarão assim que a conexão for estabelecida.
                    </p>
                  </>
                )}
              </div>
            ) : (
              notificacoes.map((notif) => (
                <NotificacaoItem
                  key={notif.id}
                  notif={notif}
                  onRemover={() => remover(notif.id)}
                  onFechar={() => setAberto(false)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notificacoes.length > 0 && (
            <div className="border-t border-surface-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-muted">
                {notificacoes.length} notificação(ões)
              </span>
              <Link
                href="/alertas"
                onClick={() => setAberto(false)}
                className="text-[11px] text-brand-600 hover:underline"
              >
                Gerenciar alertas →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Item de notificação individual ──────────────────────
function NotificacaoItem({
  notif, onRemover, onFechar,
}: {
  notif: NotificacaoToast
  onRemover: () => void
  onFechar:  () => void
}) {
  const { licitacao, alertaNome, vistoPor, chegouEm } = notif

  const minutos = Math.floor((Date.now() - chegouEm.getTime()) / 60_000)
  const tempoStr = minutos < 1
    ? 'agora mesmo'
    : minutos < 60
    ? `${minutos}min atrás`
    : `${Math.floor(minutos / 60)}h atrás`

  return (
    <div
      className={clsx(
        'flex gap-3 px-4 py-3 border-b border-surface-border last:border-0 transition-colors group',
        !vistoPor ? 'bg-brand-50/40' : 'hover:bg-surface-muted/50'
      )}
    >
      {/* Indicador não-visto */}
      <div className="mt-1.5 flex-shrink-0">
        <span className={clsx(
          'block h-1.5 w-1.5 rounded-full',
          !vistoPor ? 'bg-brand-500' : 'bg-transparent'
        )} />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
            {alertaNome}
          </span>
          <span className="text-[10px] text-muted flex items-center gap-0.5">
            <Clock size={9} />
            {tempoStr}
          </span>
        </div>

        <p className="text-xs font-medium text-text leading-snug mb-1 line-clamp-2">
          {licitacao.titulo}
        </p>

        <p className="text-[11px] text-muted mb-1.5 truncate">
          {licitacao.orgao.razaoSocial}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-surface-muted text-muted border border-surface-border">
            {MODALIDADE_LABEL[licitacao.modalidade]?.replace('Pregão Eletrônico', 'PE') ?? licitacao.modalidade}
          </span>
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-surface-muted text-muted border border-surface-border">
            {PORTAL_LABEL[licitacao.portalOrigem] ?? licitacao.portalOrigem}
          </span>
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-surface-muted text-muted border border-surface-border">
            {licitacao.uf}
          </span>
          {licitacao.valorEstimado && (
            <span className="text-[10px] font-medium text-text">
              {formatMoedaCompacta(licitacao.valorEstimado)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Link
            href={`/licitacoes/${licitacao.id}`}
            onClick={onFechar}
            className="text-[11px] text-brand-600 hover:underline font-medium"
          >
            Ver edital
          </Link>
          <a
            href={licitacao.linkEdital}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted hover:text-text flex items-center gap-0.5"
          >
            <ExternalLink size={10} />
            Portal original
          </a>
        </div>
      </div>

      {/* Remover */}
      <button
        onClick={onRemover}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-text transition-all flex-shrink-0 mt-0.5 p-0.5"
        title="Dispensar"
      >
        <X size={13} />
      </button>
    </div>
  )
}
