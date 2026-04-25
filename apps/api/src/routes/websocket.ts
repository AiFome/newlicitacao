// apps/api/src/routes/websocket.ts
import type { FastifyPluginAsync } from 'fastify'
import type { WebSocket } from 'ws'
import { prisma } from '@licitabr/database'

// ── Registro de conexões ativas ─────────────────────────
// Map<usuarioId, Set<WebSocket>>
const salas = new Map<string, Set<WebSocket>>()

export function getConexoesDoUsuario(usuarioId: string): Set<WebSocket> {
  return salas.get(usuarioId) ?? new Set()
}

/**
 * Emite um evento para todas as conexões ativas de um usuário.
 * Chamado pelo alertaEngine após cada match.
 */
export function emitirParaUsuario(
  usuarioId: string,
  evento: WsEvento
) {
  const conexoes = salas.get(usuarioId)
  if (!conexoes?.size) return

  const payload = JSON.stringify(evento)
  for (const ws of conexoes) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(payload)
    }
  }
}

/**
 * Emite para TODOS os usuários conectados.
 * Útil para broadcasts de sistema (manutenção, etc.).
 */
export function broadcast(evento: WsEvento) {
  const payload = JSON.stringify(evento)
  for (const conexoes of salas.values()) {
    for (const ws of conexoes) {
      if (ws.readyState === 1) ws.send(payload)
    }
  }
}

// ── Tipos de eventos ────────────────────────────────────
export type WsEvento =
  | { tipo: 'nova_licitacao';  licitacao: LicitacaoResumo; alertaNome: string }
  | { tipo: 'ping' }
  | { tipo: 'pong' }
  | { tipo: 'conectado';       usuarioId: string; conexoesAtivas: number }
  | { tipo: 'erro';            mensagem: string }

interface LicitacaoResumo {
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

// ── Plugin Fastify ──────────────────────────────────────
export const wsRoutes: FastifyPluginAsync = async (app) => {

  // GET /ws — upgrade para WebSocket
  app.get('/ws', { websocket: true }, async (socket, req) => {
    let usuarioId: string | null = null

    // ── Autenticação via query param (?token=...) ───────
    // O frontend passa o JWT na query string porque WS não suporta headers custom
    const token = (req.query as Record<string, string>)['token']

    if (!token) {
      socket.send(JSON.stringify({ tipo: 'erro', mensagem: 'Token ausente.' }))
      socket.close(4001, 'Não autenticado')
      return
    }

    try {
      const payload = app.jwt.verify<{ sub: string }>(token)
      usuarioId = payload.sub

      // Valida que o usuário existe e está ativo
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { id: true, ativo: true },
      })

      if (!usuario?.ativo) {
        socket.send(JSON.stringify({ tipo: 'erro', mensagem: 'Usuário inativo.' }))
        socket.close(4003, 'Acesso negado')
        return
      }
    } catch {
      socket.send(JSON.stringify({ tipo: 'erro', mensagem: 'Token inválido.' }))
      socket.close(4001, 'Token inválido')
      return
    }

    // ── Registra na sala ────────────────────────────────
    if (!salas.has(usuarioId)) salas.set(usuarioId, new Set())
    salas.get(usuarioId)!.add(socket)

    const totalConexoes = salas.get(usuarioId)!.size

    app.log.info(`[WS] Usuário ${usuarioId} conectado (${totalConexoes} conexão/ões)`)

    // Confirma conexão
    socket.send(JSON.stringify({
      tipo: 'conectado',
      usuarioId,
      conexoesAtivas: totalConexoes,
    } satisfies WsEvento))

    // ── Heartbeat — ping/pong a cada 30s ────────────────
    const heartbeat = setInterval(() => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify({ tipo: 'ping' } satisfies WsEvento))
      }
    }, 30_000)

    // ── Mensagens recebidas do cliente ──────────────────
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WsEvento
        if (msg.tipo === 'pong') return // heartbeat respondido
        app.log.debug(`[WS] Mensagem de ${usuarioId}: ${raw}`)
      } catch {
        // ignora payload malformado
      }
    })

    // ── Limpeza ao desconectar ──────────────────────────
    socket.on('close', () => {
      clearInterval(heartbeat)
      if (usuarioId) {
        const sala = salas.get(usuarioId)
        sala?.delete(socket)
        if (sala?.size === 0) salas.delete(usuarioId)
        app.log.info(`[WS] Usuário ${usuarioId} desconectado`)
      }
    })

    socket.on('error', (err) => {
      app.log.error(`[WS] Erro para ${usuarioId}: ${err.message}`)
    })
  })

  // GET /ws/stats — quantos usuários online (interno)
  app.get('/ws/stats', async () => ({
    usuariosOnline: salas.size,
    conexoesTotal:  [...salas.values()].reduce((acc, s) => acc + s.size, 0),
  }))
}
