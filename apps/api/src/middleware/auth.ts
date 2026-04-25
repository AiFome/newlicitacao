// apps/api/src/middleware/auth.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@licitabr/database'

export interface JwtPayload {
  sub: string        // usuarioId
  email: string
  plano: string
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    usuario: {
      id: string
      email: string
      plano: string
    }
  }
}

export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const payload = (await req.jwtVerify()) as JwtPayload

    // Valida se o usuário ainda existe e está ativo
    const usuario = await prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, plano: true, ativo: true },
    })

    if (!usuario || !usuario.ativo) {
      return reply.status(401).send({ error: 'Usuário inativo ou não encontrado' })
    }

    req.usuario = { id: usuario.id, email: usuario.email, plano: usuario.plano }
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

/** Garante que o usuário tem plano >= ao exigido */
export function requirePlano(...planos: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply)
    if (!planos.includes(req.usuario.plano)) {
      return reply.status(403).send({
        error: 'Plano insuficiente',
        planosNecessarios: planos,
        planoAtual: req.usuario.plano,
      })
    }
  }
}
