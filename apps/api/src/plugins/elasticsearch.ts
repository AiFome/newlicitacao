// apps/api/src/plugins/elasticsearch.ts
import fp from 'fastify-plugin'
import { Client } from '@elastic/elasticsearch'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    elastic: Client
  }
}

const MAPPING_LICITACOES = {
  mappings: {
    properties: {
      id:             { type: 'keyword' },
      titulo:         { type: 'text', analyzer: 'portuguese' },
      objeto:         { type: 'text', analyzer: 'portuguese' },
      modalidade:     { type: 'keyword' },
      situacao:       { type: 'keyword' },
      portalOrigem:   { type: 'keyword' },
      uf:             { type: 'keyword' },
      municipio:      { type: 'keyword' },
      valorEstimado:  { type: 'double' },
      dataPublicacao: { type: 'date' },
      dataAbertura:   { type: 'date' },
      dataEncerramento: { type: 'date' },
      orgao: {
        properties: {
          id:          { type: 'keyword' },
          razaoSocial: { type: 'text', analyzer: 'portuguese' },
          cnpj:        { type: 'keyword' },
          esfera:      { type: 'keyword' },
        },
      },
    },
  },
  settings: {
    analysis: {
      analyzer: {
        portuguese: {
          tokenizer: 'standard',
          filter: ['lowercase', 'portuguese_stop', 'portuguese_stemmer'],
        },
      },
      filter: {
        portuguese_stop:    { type: 'stop',    stopwords: '_portuguese_' },
        portuguese_stemmer: { type: 'stemmer', language: 'light_portuguese' },
      },
    },
  },
}

const elasticPlugin: FastifyPluginAsync = async (app) => {
  const client = new Client({
    node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
  })

  // Cria o índice se não existir
  const index = process.env.ELASTICSEARCH_INDEX_LICITACOES ?? 'licitacoes'
  const exists = await client.indices.exists({ index })
  if (!exists) {
    await client.indices.create({ index, body: MAPPING_LICITACOES })
    app.log.info(`[ElasticSearch] Índice '${index}' criado`)
  }

  app.decorate('elastic', client)

  app.addHook('onClose', async () => {
    await client.close()
  })
}

export default fp(elasticPlugin, { name: 'elasticsearch' })
export { elasticPlugin }

// ── Funções de busca ──────────────────────────────────────────────────────

export async function buscarNoElastic(
  client: Client,
  params: {
    q?: string
    modalidade?: string[]
    portal?: string[]
    uf?: string[]
    situacao?: string[]
    valorMin?: number
    valorMax?: number
    dataAberturaDe?: string
    dataAberturaAte?: string
    page: number
    limit: number
  }
) {
  const must: unknown[] = []
  const filter: unknown[] = []

  if (params.q) {
    must.push({
      multi_match: {
        query: params.q,
        fields: ['titulo^3', 'objeto^2', 'orgao.razaoSocial'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    })
  }

  if (params.modalidade?.length) filter.push({ terms: { modalidade: params.modalidade } })
  if (params.portal?.length)     filter.push({ terms: { portalOrigem: params.portal } })
  if (params.uf?.length)         filter.push({ terms: { uf: params.uf } })
  if (params.situacao?.length)   filter.push({ terms: { situacao: params.situacao } })

  if (params.valorMin !== undefined || params.valorMax !== undefined) {
    filter.push({
      range: {
        valorEstimado: {
          ...(params.valorMin !== undefined && { gte: params.valorMin }),
          ...(params.valorMax !== undefined && { lte: params.valorMax }),
        },
      },
    })
  }

  if (params.dataAberturaDe || params.dataAberturaAte) {
    filter.push({
      range: {
        dataAbertura: {
          ...(params.dataAberturaDe && { gte: params.dataAberturaDe }),
          ...(params.dataAberturaAte && { lte: params.dataAberturaAte }),
        },
      },
    })
  }

  const from = (params.page - 1) * params.limit

  const resp = await client.search({
    index: process.env.ELASTICSEARCH_INDEX_LICITACOES ?? 'licitacoes',
    body: {
      from,
      size: params.limit,
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
        },
      },
      sort: params.q
        ? [{ _score: 'desc' }, { dataAbertura: 'desc' }]
        : [{ dataAbertura: 'desc' }],
      highlight: {
        fields: {
          objeto: { number_of_fragments: 1, fragment_size: 150 },
        },
      },
    },
  })

  return {
    hits: resp.hits.hits.map((h) => ({
      ...(h._source as Record<string, unknown>),
      _score: h._score,
      _highlight: h.highlight,
    })),
    total: typeof resp.hits.total === 'number'
      ? resp.hits.total
      : (resp.hits.total as { value: number }).value,
  }
}
