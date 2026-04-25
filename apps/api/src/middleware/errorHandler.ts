// apps/api/src/middleware/errorHandler.ts
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { captureException } from '../lib/sentry.js'

export function errorHandler(
  error: FastifyError,
  req: FastifyRequest,
  reply: FastifyReply
) {
  // Erros de validação Zod
  if (error instanceof ZodError) {
    return reply.status(422).send({
      error: 'Dados inválidos',
      campos: error.errors.map((e) => ({
        campo:    e.path.join('.'),
        mensagem: e.message,
      })),
    })
  }

  // Erros do Prisma
  if (error.code === 'P2002') return reply.status(409).send({ error: 'Registro duplicado.' })
  if (error.code === 'P2025') return reply.status(404).send({ error: 'Registro não encontrado.' })

  // HTTP errors do Fastify (4xx não vão para o Sentry)
  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  // Erros 5xx → captura no Sentry
  captureException(error, {
    url:    req.url,
    method: req.method,
    userId: (req as any).usuario?.id,
  })

  return reply.status(error.statusCode ?? 500).send({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : error.message,
  })
}
