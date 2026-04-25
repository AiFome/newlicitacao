// apps/scraper/src/collectors/__tests__/pncp.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@licitabr/database'

// Mock fetch global
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock do indexer para não chamar ES real
vi.mock('../../services/indexer.js', () => ({
  indexarLicitacao: vi.fn(() => Promise.resolve()),
}))

function makePncpItem(overrides = {}) {
  return {
    numeroControlePNCP: 'PNCP-2025-001',
    numeroCompra:       '001/2025',
    objetoCompra:       'Aquisição de materiais de escritório e suprimentos',
    modalidadeId:       6, // PREGAO_ELETRONICO
    situacaoCompraId:   1, // ABERTA
    valorTotalEstimado: 50000,
    valorTotalHomologado: null,
    dataPublicacaoPncp: '2025-01-15',
    dataAberturaProposta:'2025-02-01T10:00:00',
    dataEncerramentoProposta: '2025-02-01T12:00:00',
    linkSistemaOrigem:  null,
    anoCompra:          2025,
    sequencialCompra:   1,
    orgaoEntidade: {
      cnpj:        '46.392.130/0001-69',
      razaoSocial: 'Prefeitura de Campinas',
      esferaId:    3, // MUNICIPAL
      poderId:     'E',
      uf:          'SP',
      municipio:   'Campinas',
    },
    ...overrides,
  }
}

describe('coletarPNCP', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock padrão: orgao e licitacao upsertados com sucesso
    vi.mocked(prisma.orgao.upsert).mockResolvedValue({ id: 'org-001' } as any)
    vi.mocked(prisma.licitacao.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.licitacao.upsert).mockResolvedValue({ id: 'lic-001' } as any)
  })

  it('coleta e persiste licitações da API PNCP', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: () => Promise.resolve({
        data:          [makePncpItem()],
        totalRegistros: 1,
        totalPaginas:  1,
      }),
    })

    const { coletarPNCP } = await import('../pncp.js')
    const stats = await coletarPNCP({ dataInicio: '20250101', dataFim: '20250131' })

    expect(stats.total).toBe(1)
    expect(stats.novos).toBe(1)
    expect(stats.erros).toBe(0)
    expect(prisma.orgao.upsert).toHaveBeenCalledOnce()
    expect(prisma.licitacao.upsert).toHaveBeenCalledOnce()
  })

  it('conta como atualizado quando licitação já existe', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: () => Promise.resolve({
        data: [makePncpItem()],
        totalRegistros: 1, totalPaginas: 1,
      }),
    })

    // Simula licitação já existente
    vi.mocked(prisma.licitacao.findUnique).mockResolvedValue({ id: 'lic-001' } as any)

    const { coletarPNCP } = await import('../pncp.js')
    const stats = await coletarPNCP({ dataInicio: '20250101', dataFim: '20250131' })

    expect(stats.novos).toBe(0)
    expect(stats.atualizados).toBe(1)
  })

  it('conta erros sem parar a coleta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok:   true,
      json: () => Promise.resolve({
        data: [makePncpItem(), makePncpItem({ numeroControlePNCP: 'PNCP-002' })],
        totalRegistros: 2, totalPaginas: 1,
      }),
    })

    // Primeiro upsert funciona, segundo falha
    vi.mocked(prisma.licitacao.upsert)
      .mockResolvedValueOnce({ id: 'lic-001' } as any)
      .mockRejectedValueOnce(new Error('DB error'))

    const { coletarPNCP } = await import('../pncp.js')
    const stats = await coletarPNCP({ dataInicio: '20250101', dataFim: '20250131' })

    expect(stats.total).toBe(2)
    expect(stats.novos).toBe(1)
    expect(stats.erros).toBe(1)
  })

  it('lida com paginação corretamente', async () => {
    // Página 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [makePncpItem()], totalRegistros: 2, totalPaginas: 2,
      }),
    })
    // Página 2
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [makePncpItem({ numeroControlePNCP: 'PNCP-002' })], totalRegistros: 2, totalPaginas: 2,
      }),
    })

    const { coletarPNCP } = await import('../pncp.js')
    const stats = await coletarPNCP({ dataInicio: '20250101', dataFim: '20250131' })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(stats.total).toBe(2)
  })

  it('retorna erro quando API PNCP falha', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Service Unavailable' })

    const { coletarPNCP } = await import('../pncp.js')
    await expect(coletarPNCP({ dataInicio: '20250101', dataFim: '20250131' }))
      .rejects.toThrow('PNCP API error')
  })
})
