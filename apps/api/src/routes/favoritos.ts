// apps/api/src/routes/favoritos.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'

const adicionarSchema = z.object({
  licitacaoId: z.string().uuid(),
  nota:        z.string().max(1000).optional(),
  tags:        z.array(z.string().max(50)).max(10).default([]),
})

const atualizarSchema = z.object({
  nota: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const favoritoRoutes: FastifyPluginAsync = async (app) => {
  // Todos os endpoints exigem autenticação
  app.addHook('preHandler', authenticate)

  // GET /v1/favoritos — lista todos os favoritos do usuário
  app.get('/', async (req, reply) => {
    const favoritos = await prisma.favorito.findMany({
      where: { usuarioId: req.usuario.id },
      orderBy: { createdAt: 'desc' },
      include: {
        licitacao: {
          include: {
            orgao: {
              select: {
                id:          true,
                razaoSocial: true,
                cnpj:        true,
                esfera:      true,
                uf:          true,
              },
            },
            anexos: {
              select: {
                id:           true,
                nomeArquivo:  true,
                tipoArquivo:  true,
                urlStorage:   true,
                tamanhoBytes: true,
              },
            },
          },
        },
      },
    })

    return reply.send(favoritos)
  })

  // GET /v1/favoritos/ids — retorna só os IDs favoritados (leve, para o frontend checar)
  app.get('/ids', async (req, reply) => {
    const favoritos = await prisma.favorito.findMany({
      where:  { usuarioId: req.usuario.id },
      select: { id: true, licitacaoId: true },
    })
    return reply.send(favoritos)
  })

  // POST /v1/favoritos — adiciona favorito
  app.post('/', async (req, reply) => {
    const body = adicionarSchema.parse(req.body)

    // Verifica se a licitação existe
    const licitacao = await prisma.licitacao.findUnique({
      where:  { id: body.licitacaoId },
      select: { id: true, titulo: true },
    })
    if (!licitacao) {
      return reply.status(404).send({ error: 'Licitação não encontrada.' })
    }

    // Verifica se já favoritou
    const existe = await prisma.favorito.findUnique({
      where: {
        usuarioId_licitacaoId: {
          usuarioId:   req.usuario.id,
          licitacaoId: body.licitacaoId,
        },
      },
    })
    if (existe) {
      return reply.status(409).send({ error: 'Licitação já está nos favoritos.' })
    }

    const favorito = await prisma.favorito.create({
      data: {
        usuarioId:   req.usuario.id,
        licitacaoId: body.licitacaoId,
        nota:        body.nota ?? null,
        tags:        body.tags,
      },
      include: {
        licitacao: {
          include: {
            orgao: { select: { id: true, razaoSocial: true, uf: true } },
          },
        },
      },
    })

    return reply.status(201).send(favorito)
  })

  // PATCH /v1/favoritos/:id — atualiza nota e tags
  app.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const body = atualizarSchema.parse(req.body)

    const favorito = await prisma.favorito.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    })
    if (!favorito) {
      return reply.status(404).send({ error: 'Favorito não encontrado.' })
    }

    const atualizado = await prisma.favorito.update({
      where: { id: req.params.id },
      data: {
        ...(body.nota  !== undefined && { nota: body.nota }),
        ...(body.tags  !== undefined && { tags: body.tags }),
      },
    })

    return reply.send(atualizado)
  })

  // DELETE /v1/favoritos/:id — remove pelo ID do favorito
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const favorito = await prisma.favorito.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    })
    if (!favorito) {
      return reply.status(404).send({ error: 'Favorito não encontrado.' })
    }

    await prisma.favorito.delete({ where: { id: req.params.id } })
    return reply.send({ ok: true })
  })

  // DELETE /v1/favoritos/licitacao/:licitacaoId — remove pela licitação (mais prático no frontend)
  app.delete<{ Params: { licitacaoId: string } }>(
    '/licitacao/:licitacaoId',
    async (req, reply) => {
      const deletado = await prisma.favorito.deleteMany({
        where: {
          usuarioId:   req.usuario.id,
          licitacaoId: req.params.licitacaoId,
        },
      })

      if (deletado.count === 0) {
        return reply.status(404).send({ error: 'Favorito não encontrado.' })
      }

      return reply.send({ ok: true })
    }
  )

  // GET /v1/favoritos/:id — detalhe de um favorito específico
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const favorito = await prisma.favorito.findFirst({
      where: { id: req.params.id, usuarioId: req.usuario.id },
      include: {
        licitacao: {
          include: {
            orgao:  true,
            anexos: true,
            itens:  true,
          },
        },
      },
    })
    if (!favorito) {
      return reply.status(404).send({ error: 'Favorito não encontrado.' })
    }

    return reply.send(favorito)
  })
}
