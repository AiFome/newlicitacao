// apps/api/src/middleware/rateLimitPlano.ts
//
// Middleware Fastify que limita buscas por hora de acordo com o plano do usuário.
// Usa Redis com chave TTL deslizante (sliding window).
//
// Limites:
//   FREE          → 30 buscas/hora
//   BASICO        → 200 buscas/hora
//   PROFISSIONAL  → ilimitado
//   ENTERPRISE    → ilimitado

import type { FastifyRequest, FastifyReply } from 'fastify'

const LIMITES: Record<string, number | null> = {
  FREE:         30,
  BASICO:       200,
  PROFISSIONAL: null,   // null = ilimitado
  ENTERPRISE:   null,
}

const JANELA_SEGUNDOS = 3600 // 1 hora

export async function rateLimitPlano(
  req:   FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Sem usuário autenticado → deixa passar (a rota de busca é pública)
  const usuario = (req as any).usuario
  if (!usuario) return

  const plano  = (usuario.plano as string) ?? 'FREE'
  const limite = LIMITES[plano] ?? LIMITES['FREE']!

  // Plano ilimitado — skip
  if (limite === null) return

  const chave = `ratelimit:busca:${usuario.id}`

  // Incrementa contador com pipeline atômico
  const redis  = (req.server as any).redis
  const atual  = await redis.incr(chave)

  // Define TTL apenas na primeira chamada da janela
  if (atual === 1) {
    await redis.expire(chave, JANELA_SEGUNDOS)
  }

  // Adiciona headers informativos
  const ttl      = await redis.ttl(chave)
  const restante = Math.max(0, limite - atual)
  const reset    = Math.floor(Date.now() / 1000) + ttl

  reply.header('X-RateLimit-Limit',     String(limite))
  reply.header('X-RateLimit-Remaining', String(restante))
  reply.header('X-RateLimit-Reset',     String(reset))
  reply.header('X-RateLimit-Plan',      plano)

  if (atual > limite) {
    reply.status(429).send({
      error:     'Limite de buscas atingido para o plano atual.',
      plano,
      limite,
      resetEm:   new Date(reset * 1000).toISOString(),
      upgrade:   plano === 'FREE'   ? 'https://licitabr.com.br/planos' : undefined,
    })
    return reply
  }
}
