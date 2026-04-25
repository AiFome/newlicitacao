'use client'
// apps/web/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'

// ── Tipos de eventos recebidos ──────────────────────────
export interface LicitacaoWs {
  id: string
  titulo: string
  objeto: string
  modalidade: string
  situacao: string
  valorEstimado: number | null
  dataAbertura: string
  uf: string
  portalOrigem: string
  linkEdital: string
  orgao: { razaoSocial: string }
}

export type WsEvento =
  | { tipo: 'nova_licitacao';  licitacao: LicitacaoWs; alertaNome: string }
  | { tipo: 'ping' }
  | { tipo: 'pong' }
  | { tipo: 'conectado';       usuarioId: string; conexoesAtivas: number }
  | { tipo: 'erro';            mensagem: string }

export type StatusWs = 'desconectado' | 'conectando' | 'conectado' | 'erro'

interface UseWebSocketOptions {
  onEvento?: (evento: WsEvento) => void
  habilitado?: boolean
}

const WS_BASE = (process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:3001').replace(/\/$/, '')
const RECONEXAO_DELAYS = [1_000, 2_000, 5_000, 10_000, 30_000] // backoff exponencial

export function useWebSocket({ onEvento, habilitado = true }: UseWebSocketOptions = {}) {
  const { token } = useAuthStore()
  const wsRef        = useRef<WebSocket | null>(null)
  const tentativaRef = useRef(0)
  const timeoutRef   = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef   = useRef(true)

  const [status, setStatus] = useState<StatusWs>('desconectado')

  const conectar = useCallback(() => {
    if (!token || !mountedRef.current || !habilitado) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    setStatus('conectando')

    const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      tentativaRef.current = 0
      setStatus('conectado')
    }

    ws.onmessage = (event) => {
      if (!mountedRef.current) return
      try {
        const evento = JSON.parse(event.data) as WsEvento

        // Responde ao ping do servidor automaticamente
        if (evento.tipo === 'ping') {
          ws.send(JSON.stringify({ tipo: 'pong' }))
          return
        }

        onEvento?.(evento)
      } catch {
        // payload malformado — ignora
      }
    }

    ws.onclose = (e) => {
      wsRef.current = null
      if (!mountedRef.current) return

      // Código 4001/4003 = erro de autenticação → não reconecta
      if (e.code === 4001 || e.code === 4003) {
        setStatus('erro')
        return
      }

      setStatus('desconectado')
      // Backoff exponencial
      const delay = RECONEXAO_DELAYS[Math.min(tentativaRef.current, RECONEXAO_DELAYS.length - 1)] ?? 30_000
      tentativaRef.current++
      timeoutRef.current = setTimeout(conectar, delay)
    }

    ws.onerror = () => {
      // onclose será chamado logo depois — lida lá
    }
  }, [token, habilitado, onEvento])

  const desconectar = useCallback(() => {
    clearTimeout(timeoutRef.current)
    wsRef.current?.close()
    wsRef.current = null
    setStatus('desconectado')
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (habilitado && token) conectar()
    return () => {
      mountedRef.current = false
      desconectar()
    }
  }, [token, habilitado, conectar, desconectar])

  return { status, desconectar }
}

// ── Hook de alto nível — mantém fila de notificações ────
export interface NotificacaoToast {
  id: string
  licitacao: LicitacaoWs
  alertaNome: string
  vistoPor: boolean
  chegouEm: Date
}

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoToast[]>([])
  const [naoVistas, setNaoVistas]       = useState(0)

  const handleEvento = useCallback((evento: WsEvento) => {
    if (evento.tipo !== 'nova_licitacao') return

    const nova: NotificacaoToast = {
      id:         crypto.randomUUID(),
      licitacao:  evento.licitacao,
      alertaNome: evento.alertaNome,
      vistoPor:   false,
      chegouEm:   new Date(),
    }

    setNotificacoes((prev) => [nova, ...prev].slice(0, 50)) // mantém últimas 50
    setNaoVistas((n) => n + 1)
  }, [])

  const { status } = useWebSocket({ onEvento: handleEvento })

  const marcarTodasVistas = useCallback(() => {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, vistoPor: true })))
    setNaoVistas(0)
  }, [])

  const remover = useCallback((id: string) => {
    setNotificacoes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { notificacoes, naoVistas, status, marcarTodasVistas, remover }
}
