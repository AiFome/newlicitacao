// apps/api/src/routes/internal.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@licitabr/database'
import { processarAlertasParaLicitacao } from '../services/alertaEngine.js'

// indexarLicitacao vive no scraper; na API usamos o client decorado diretamente
async function indexarNaApi(elastic: import('@elastic/elasticsearch').Client, licitacaoId: string) {
  const lic = await prisma.licitacao.findUnique({
    where:   { id: licitacaoId },
    include: { orgao: { select: { id: true, razaoSocial: true, cnpj: true, esfera: true } } },
  })
  if (!lic) return

  const INDEX = process.env.ELASTICSEARCH_INDEX_LICITACOES ?? 'licitacoes'
  await elastic.index({
    index:    INDEX,
    id:       lic.id,
    document: {
      id:              lic.id,
      titulo:          lic.titulo,
      objeto:          lic.objeto,
      modalidade:      lic.modalidade,
      situacao:        lic.situacao,
      portalOrigem:    lic.portalOrigem,
      uf:              lic.uf,
      municipio:       lic.municipio,
      valorEstimado:   lic.valorEstimado ? Number(lic.valorEstimado) : null,
      dataPublicacao:  lic.dataPublicacao.toISOString(),
      dataAbertura:    lic.dataAbertura.toISOString(),
      dataEncerramento:lic.dataEncerramento?.toISOString() ?? null,
      orgao: {
        id:          lic.orgao.id,
        razaoSocial: lic.orgao.razaoSocial,
        cnpj:        lic.orgao.cnpj,
        esfera:      lic.orgao.esfera,
      },
    },
  })
  await prisma.licitacao.update({ where: { id: licitacaoId }, data: { indexadoEm: new Date() } })
}

function autenticarInterno(chaveEsperada: string | undefined) {
  return async function (req: any, reply: any) {
    if (!chaveEsperada || req.headers['x-internal-key'] !== chaveEsperada) {
      return reply.status(401).send({ error: 'Acesso negado.' })
    }
  }
}

export const internalRoutes: FastifyPluginAsync = async (app) => {
  const chaveInterna = process.env.INTERNAL_API_KEY
  app.addHook('preHandler', autenticarInterno(chaveInterna))

  // POST /internal/alertas/processar — chamado pelo scraper após nova licitação
  app.post('/alertas/processar', async (req, reply) => {
    const { licitacaoId } = z.object({ licitacaoId: z.string().uuid() }).parse(req.body)

    setImmediate(async () => {
      try {
        const matches = await processarAlertasParaLicitacao(licitacaoId)
        app.log.info(`[Internal] ${matches} alerta(s) disparado(s) para ${licitacaoId}`)
      } catch (err) {
        app.log.error(`[Internal] Erro ao processar alertas para ${licitacaoId}:`, err)
      }
    })

    return reply.send({ ok: true, licitacaoId })
  })

  // POST /internal/indexar — força reindexação de uma licitação
  app.post('/indexar', async (req, reply) => {
    const { licitacaoId } = z.object({ licitacaoId: z.string().uuid() }).parse(req.body)

    setImmediate(async () => {
      try {
        await indexarNaApi(app.elastic, licitacaoId)
        app.log.info(`[Internal] ${licitacaoId} reindexada`)
      } catch (err) {
        app.log.error(`[Internal] Erro ao indexar ${licitacaoId}:`, err)
      }
    })

    return reply.send({ ok: true, licitacaoId })
  })

  // GET /internal/health — status detalhado de infraestrutura
  app.get('/health', async (_req, reply) => {
    const [pgOk, redisOk, esOk] = await Promise.allSettled([
      prisma.$queryRaw`SELECT 1`,
      app.redis.ping(),
      app.elastic.ping(),
    ])

    const status = {
      postgres:      pgOk.status      === 'fulfilled' ? 'ok' : 'error',
      redis:         redisOk.status   === 'fulfilled' ? 'ok' : 'error',
      elasticsearch: esOk.status      === 'fulfilled' ? 'ok' : 'error',
    }

    const allOk = Object.values(status).every((s) => s === 'ok')
    return reply.status(allOk ? 200 : 503).send({ ...status, timestamp: new Date().toISOString() })
  })
}
