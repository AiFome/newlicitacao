// apps/api/src/routes/alertas.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'
import { PLANOS } from '@licitabr/shared'

const alertaSchema = z.object({
  nome:          z.string().min(1).max(80),
  palavrasChave: z.array(z.string().min(1)).min(1),
  modalidades:   z.array(z.string()).default([]),
  portais:       z.array(z.string()).default([]),
  ufs:           z.array(z.string().length(2)).default([]),
  valorMin:      z.number().positive().optional(),
  valorMax:      z.number().positive().optional(),
  canal:         z.array(z.enum(['EMAIL', 'TELEGRAM', 'PUSH', 'WEBHOOK'])).min(1),
  frequencia:    z.enum(['IMEDIATO', 'DIARIO', 'SEMANAL']).default('IMEDIATO'),
  ativo:         z.boolean().default(true),
})

export const alertaRoutes: FastifyPluginAsync = async (app) => {
  // Todos os endpoints exigem autenticação
  app.addHook('preHandler', authenticate)

  // GET /v1/alertas
  app.get('/', async (req, reply) => {
    const alertas = await prisma.alertaConfig.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(alertas)
  })

  // POST /v1/alertas
  app.post('/', async (req, reply) => {
    const body = alertaSchema.parse(req.body)
    const plano = req.usuario.plano as keyof typeof PLANOS
    const limites = PLANOS[plano]

    // Verifica limite de alertas do plano
    if (limites.alertas !== -1) {
      const total = await prisma.alertaConfig.count({
        where: { usuarioId: req.usuario.id, ativo: true },
      })
      if (total >= limites.alertas) {
        return reply.status(403).send({
          error: `Seu plano ${plano} permite no máximo ${limites.alertas} alerta(s) ativo(s).`,
          upgrade: true,
        })
      }
    }

    // Verifica limite de palavras-chave
    if (limites.palavrasChave !== -1 && body.palavrasChave.length > limites.palavrasChave) {
      return reply.status(403).send({
        error: `Seu plano permite no máximo ${limites.palavrasChave} palavras-chave por alerta.`,
        upgrade: true,
      })
    }

    // Verifica portais permitidos pelo plano
    const portaisInvalidos = body.portais.filter(
      (p) => !(limites.portais as string[]).includes(p)
    )
    if (portaisInvalidos.length > 0) {
      return reply.status(403).send({
        error: `Portais não disponíveis no seu plano: ${portaisInvalidos.join(', ')}`,
        upgrade: true,
      })
    }

    const alerta = await prisma.alertaConfig.create({
      data: {
        ...body,
        usuarioId: req.usuario.id,
        modalidades: body.modalidades as any[],
        portais: body.portais as any[],
        canal: body.canal as any[],
      },
    })

    return reply.status(201).send(alerta)
  })

  // PATCH /v1/alertas/:id
  app.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const body = alertaSchema.partial().parse(req.body)

    const alerta = await prisma.alertaConfig.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    })
    if (!alerta) return reply.status(404).send({ error: 'Alerta não encontrado' })

    const updated = await prisma.alertaConfig.update({
      where: { id: req.params.id },
      data: {
        ...body,
        modalidades: body.modalidades as any[] | undefined,
        portais: body.portais as any[] | undefined,
        canal: body.canal as any[] | undefined,
      },
    })

    return reply.send(updated)
  })

  // DELETE /v1/alertas/:id
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const alerta = await prisma.alertaConfig.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    })
    if (!alerta) return reply.status(404).send({ error: 'Alerta não encontrado' })

    await prisma.alertaConfig.delete({ where: { id: req.params.id } })
    return reply.send({ ok: true })
  })

  // POST /v1/alertas/:id/testar — dispara uma busca teste imediata
  app.post<{ Params: { id: string } }>('/:id/testar', async (req, reply) => {
    const alerta = await prisma.alertaConfig.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    })
    if (!alerta) return reply.status(404).send({ error: 'Alerta não encontrado' })

    const where: Record<string, unknown> = {
      situacao: 'ABERTA',
      ...(alerta.ufs.length > 0 && { uf: { in: alerta.ufs } }),
      ...(alerta.modalidades.length > 0 && { modalidade: { in: alerta.modalidades } }),
      ...(alerta.portais.length > 0 && { portalOrigem: { in: alerta.portais } }),
    }

    if (alerta.palavrasChave.length > 0) {
      where.OR = alerta.palavrasChave.map((kw) => ({
        objeto: { contains: kw, mode: 'insensitive' },
      }))
    }

    const resultados = await prisma.licitacao.findMany({
      where,
      take: 5,
      orderBy: { dataAbertura: 'asc' },
      include: { orgao: { select: { razaoSocial: true } } },
    })

    return reply.send({ total: resultados.length, amostra: resultados })
  })
}
