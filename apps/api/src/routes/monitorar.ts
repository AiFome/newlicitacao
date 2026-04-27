// apps/api/src/routes/monitorar.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'

export const monitorarRoutes: FastifyPluginAsync = async (app) => {

  // GET /v1/monitorar — busca config do usuário
  app.get('/', { preHandler: authenticate }, async (req, reply) => {
    const { sub } = (req as any).user
    let config = await prisma.monitorarConfig.findFirst({
      where: { usuarioId: sub },
    })
    if (!config) {
      config = await prisma.monitorarConfig.create({
        data: { usuarioId: sub, palavras: [] },
      })
    }
    return reply.send(config)
  })

  // PUT /v1/monitorar — salva palavras-chave
  app.put('/', { preHandler: authenticate }, async (req, reply) => {
    const { sub } = (req as any).user
    const { palavras } = z.object({
      palavras: z.array(z.string().min(1).max(100)).max(50),
    }).parse(req.body)

    const existing = await prisma.monitorarConfig.findFirst({ where: { usuarioId: sub } })

    if (existing) {
      const updated = await prisma.monitorarConfig.update({
        where: { id: existing.id },
        data:  { palavras },
      })
      return reply.send(updated)
    } else {
      const created = await prisma.monitorarConfig.create({
        data: { usuarioId: sub, palavras },
      })
      return reply.send(created)
    }
  })

  // DELETE /v1/monitorar/palavra — remove uma palavra
  app.delete('/palavra', { preHandler: authenticate }, async (req, reply) => {
    const { sub } = (req as any).user
    const { palavra } = z.object({ palavra: z.string() }).parse(req.body)

    const config = await prisma.monitorarConfig.findFirst({ where: { usuarioId: sub } })
    if (!config) return reply.send({ ok: true })

    const novasPalavras = config.palavras.filter((p: string) => p !== palavra)
    await prisma.monitorarConfig.update({
      where: { id: config.id },
      data:  { palavras: novasPalavras },
    })
    return reply.send({ ok: true, palavras: novasPalavras })
  })
}
