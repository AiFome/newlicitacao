// apps/api/src/routes/licitacoes.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'
import { rateLimitPlano } from '../middleware/rateLimitPlano.js'
import { buscarNoElastic } from '../plugins/elasticsearch.js'
import { withCache } from '../plugins/redis.js'

const buscaSchema = z.object({
  q:              z.string().optional(),
  modalidade:     z.string().optional(),
  portal:         z.string().optional(),
  uf:             z.string().optional(),
  situacao:       z.string().optional(),
  valorMin:       z.coerce.number().optional(),
  valorMax:       z.coerce.number().optional(),
  dataAberturaDe: z.string().optional(),
  dataAberturaAte:z.string().optional(),
  page:           z.coerce.number().default(1),
  limit:          z.coerce.number().max(50).default(20),
  sort:           z.enum(['recentes','abertura','valor_asc','valor_desc']).default('recentes'),
})

export const licitacaoRoutes: FastifyPluginAsync = async (app) => {

  // GET /v1/licitacoes — busca inteligente: ES quando há query de texto, Postgres nos filtros puros
  // Rate limit aplicado por plano (FREE: 30/h, BASICO: 200/h, PRO: ilimitado)
  app.get('/', {
    preHandler: [
      // Autenticação opcional — se não tiver token, a busca é pública mas sem rate limit personalizado
      async (req, reply) => {
        try { await req.jwtVerify(); (req as any).usuario = (req as any).user } catch { /* público */ }
      },
      rateLimitPlano,
    ],
  }, async (req, reply) => {
    const params = buscaSchema.parse(req.query)

    // Com query de texto → ElasticSearch (ranking de relevância + highlight)
    if (params.q && params.q.trim().length > 0) {
      try {
        const cacheKey = `busca:es:${JSON.stringify(params)}`
        const resultado = await withCache(app.redis, cacheKey, 60, () =>
          buscarNoElastic(app.elastic, {
            q:              params.q,
            modalidade:     params.modalidade?.split(','),
            portal:         params.portal?.split(','),
            uf:             params.uf?.split(','),
            situacao:       params.situacao?.split(','),
            valorMin:       params.valorMin,
            valorMax:       params.valorMax,
            dataAberturaDe: params.dataAberturaDe,
            dataAberturaAte:params.dataAberturaAte,
            page:           params.page,
            limit:          params.limit,
          })
        )

        return reply.send({
          data:       resultado.hits,
          total:      resultado.total,
          page:       params.page,
          limit:      params.limit,
          totalPages: Math.ceil(resultado.total / params.limit),
          fonte:      'elasticsearch',
        })
      } catch (err) {
        // Fallback para Postgres se ES estiver fora
        app.log.warn('[Busca] ElasticSearch indisponível, usando Postgres:', err)
      }
    }

    // Sem query de texto ou fallback → Postgres com cache
    const cacheKey = `busca:pg:${JSON.stringify(params)}`
    const resultado = await withCache(app.redis, cacheKey, 30, async () => {
      const where: Record<string, unknown> = {}

      if (params.q) {
        where.OR = [
          { titulo: { contains: params.q, mode: 'insensitive' } },
          { objeto: { contains: params.q, mode: 'insensitive' } },
        ]
      }
      if (params.modalidade) where.modalidade   = { in: params.modalidade.split(',') }
      if (params.portal)     where.portalOrigem  = { in: params.portal.split(',') }
      if (params.uf)         where.uf            = { in: params.uf.split(',') }
      if (params.situacao)   where.situacao      = { in: params.situacao.split(',') }
      if (params.valorMin !== undefined || params.valorMax !== undefined) {
        where.valorEstimado = {
          ...(params.valorMin !== undefined && { gte: params.valorMin }),
          ...(params.valorMax !== undefined && { lte: params.valorMax }),
        }
      }
      if (params.dataAberturaDe || params.dataAberturaAte) {
        where.dataAbertura = {
          ...(params.dataAberturaDe  && { gte: new Date(params.dataAberturaDe) }),
          ...(params.dataAberturaAte && { lte: new Date(params.dataAberturaAte) }),
        }
      }

      const orderBy =
        params.sort === 'abertura'   ? { dataAbertura:   'asc'  as const } :
        params.sort === 'valor_asc'  ? { valorEstimado:  'asc'  as const } :
        params.sort === 'valor_desc' ? { valorEstimado:  'desc' as const } :
                                       { createdAt:      'desc' as const }

      const skip = (params.page - 1) * params.limit

      const [data, total] = await prisma.$transaction([
        prisma.licitacao.findMany({
          where, orderBy, skip, take: params.limit,
          include: {
            orgao:  { select: { id: true, razaoSocial: true, uf: true, esfera: true } },
            anexos: { select: { id: true, nomeArquivo: true, tipoArquivo: true, urlStorage: true } },
          },
        }),
        prisma.licitacao.count({ where }),
      ])

      return { data, total }
    })

    return reply.send({
      ...resultado,
      page:       params.page,
      limit:      params.limit,
      totalPages: Math.ceil(resultado.total / params.limit),
      fonte:      'postgres',
    })
  })

  // GET /v1/licitacoes/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const cacheKey = `licitacao:${req.params.id}`
    const licitacao = await withCache(app.redis, cacheKey, 300, () =>
      prisma.licitacao.findUniqueOrThrow({
        where:   { id: req.params.id },
        include: { orgao: true, anexos: true, itens: true },
      })
    )
    return reply.send(licitacao)
  })

  // GET /v1/licitacoes/:id/similares
  app.get<{ Params: { id: string } }>(
    '/:id/similares',
    { preHandler: authenticate },
    async (req, reply) => {
      const licitacao = await prisma.licitacao.findUniqueOrThrow({
        where:  { id: req.params.id },
        select: { modalidade: true, uf: true },
      })
      const similares = await prisma.licitacao.findMany({
        where: {
          id:        { not: req.params.id },
          modalidade: licitacao.modalidade,
          uf:         licitacao.uf,
          situacao:   'ABERTA',
        },
        take:    5,
        include: { orgao: { select: { razaoSocial: true } } },
      })
      return reply.send(similares)
    }
  )
}
