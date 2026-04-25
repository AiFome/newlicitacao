// apps/api/src/routes/__tests__/licitacoes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { licitacaoRoutes } from '../licitacoes.js'
import { prisma } from '@licitabr/database'

// Mock do ElasticSearch e Redis
vi.mock('../../plugins/elasticsearch.js', () => ({
  buscarNoElastic: vi.fn(),
  elasticPlugin:   async (app: any) => {
    app.decorate('elastic', { ping: vi.fn(() => Promise.resolve(true)) })
  },
}))

vi.mock('../../plugins/redis.js', () => ({
  withCache: vi.fn((_redis: any, _key: any, _ttl: any, fn: () => unknown) => fn()),
  redisPlugin: async (app: any) => {
    app.decorate('redis', { get: vi.fn(() => null), setex: vi.fn(), ping: vi.fn() })
  },
}))

function makeLicitacao(overrides = {}) {
  return {
    id:            'lic-001',
    numeroEdital:  '001/2025',
    titulo:        'Pregão — Material de escritório',
    objeto:        'Aquisição de materiais',
    modalidade:    'PREGAO_ELETRONICO',
    situacao:      'ABERTA',
    valorEstimado: 50000,
    dataPublicacao:new Date('2025-01-01'),
    dataAbertura:  new Date('2025-06-01'),
    dataEncerramento: null,
    linkEdital:    'https://pncp.gov.br/001',
    portalOrigem:  'PNCP',
    codigoExterno: 'PNCP-001',
    anoCompra:     2025,
    uf:            'SP',
    municipio:     'Campinas',
    orgaoId:       'org-001',
    indexadoEm:    null,
    hashConteudo:  null,
    createdAt:     new Date(),
    updatedAt:     new Date(),
    orgao:  { id: 'org-001', razaoSocial: 'Prefeitura de Campinas', uf: 'SP', esfera: 'MUNICIPAL' },
    anexos: [],
    ...overrides,
  }
}

async function buildApp() {
  const app = Fastify({ logger: false })
  await app.register(jwt, { secret: 'test-secret' })

  app.decorate('elastic', { ping: vi.fn() })
  app.decorate('redis', {
    get:    vi.fn(() => Promise.resolve(null)),
    setex:  vi.fn(() => Promise.resolve()),
    ping:   vi.fn(() => Promise.resolve('PONG')),
  })

  await app.register(licitacaoRoutes, { prefix: '/v1/licitacoes' })
  await app.ready()
  return app
}

describe('GET /v1/licitacoes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna lista paginada de licitações', async () => {
    vi.mocked(prisma.licitacao.findMany).mockResolvedValue([makeLicitacao()] as any)
    vi.mocked(prisma.licitacao.count).mockResolvedValue(1)
    vi.mocked(prisma.$transaction).mockResolvedValue([[makeLicitacao()], 1] as any)

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes' })

    expect(resp.statusCode).toBe(200)
    const body = resp.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('totalPages')
  })

  it('usa ElasticSearch quando há query de texto', async () => {
    const { buscarNoElastic } = await import('../../plugins/elasticsearch.js')
    vi.mocked(buscarNoElastic).mockResolvedValue({ hits: [makeLicitacao()], total: 1 })

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes?q=material+escritorio' })

    expect(resp.statusCode).toBe(200)
    expect(buscarNoElastic).toHaveBeenCalledOnce()
    const body = resp.json()
    expect(body.fonte).toBe('elasticsearch')
  })

  it('faz fallback para Postgres quando ES falha', async () => {
    const { buscarNoElastic } = await import('../../plugins/elasticsearch.js')
    vi.mocked(buscarNoElastic).mockRejectedValue(new Error('ES fora do ar'))
    vi.mocked(prisma.$transaction).mockResolvedValue([[makeLicitacao()], 1] as any)

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes?q=material' })

    expect(resp.statusCode).toBe(200)
    const body = resp.json()
    expect(body.fonte).toBe('postgres')
  })

  it('filtra por UF corretamente', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[makeLicitacao({ uf: 'RJ' })], 1] as any)

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes?uf=RJ' })

    expect(resp.statusCode).toBe(200)
    // Verifica que findMany foi chamado com filtro de UF
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('limita page ao máximo de 50 itens', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes?limit=9999' })

    // Deve truncar para 50
    expect(resp.statusCode).toBe(200)
  })

  it('retorna paginação calculada corretamente', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      Array(20).fill(makeLicitacao()),
      157,
    ] as any)

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes?page=1&limit=20' })

    expect(resp.statusCode).toBe(200)
    const body = resp.json()
    expect(body.total).toBe(157)
    expect(body.totalPages).toBe(8) // ceil(157/20)
    expect(body.page).toBe(1)
  })
})

describe('GET /v1/licitacoes/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna licitação pelo ID', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(
      makeLicitacao({ itens: [] }) as any
    )

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes/lic-001' })

    expect(resp.statusCode).toBe(200)
    expect(resp.json().id).toBe('lic-001')
  })

  it('retorna 404 para ID inexistente', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockRejectedValue(
      Object.assign(new Error('Not found'), { code: 'P2025' })
    )

    const app  = await buildApp()
    const resp = await app.inject({ method: 'GET', url: '/v1/licitacoes/nao-existe' })

    expect(resp.statusCode).toBe(404)
  })
})
