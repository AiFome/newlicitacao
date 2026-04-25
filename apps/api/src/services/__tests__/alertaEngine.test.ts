// apps/api/src/services/__tests__/alertaEngine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@licitabr/database'
import { processarAlertasParaLicitacao } from '../alertaEngine.js'

// Fábrica de licitação fake
function makeLicitacao(overrides = {}) {
  return {
    id:           'lic-001',
    titulo:       'Pregão Eletrônico — Material de escritório',
    objeto:       'Aquisição de materiais de escritório e suprimentos de informática',
    modalidade:   'PREGAO_ELETRONICO',
    situacao:     'ABERTA',
    portalOrigem: 'PNCP',
    uf:           'SP',
    valorEstimado: 50000,
    dataAbertura:  new Date('2025-06-01'),
    linkEdital:   'https://pncp.gov.br/edital/001',
    orgao:        { razaoSocial: 'Prefeitura de Campinas' },
    ...overrides,
  }
}

// Fábrica de alerta fake
function makeAlerta(overrides = {}) {
  return {
    id:            'alerta-001',
    usuarioId:     'user-001',
    nome:          'Material SP',
    palavrasChave: ['material de escritório'],
    modalidades:   [],
    portais:       [],
    ufs:           ['SP'],
    valorMin:      null,
    valorMax:      null,
    canal:         ['EMAIL'],
    usuario: {
      id:            'user-001',
      email:         'joao@email.com',
      notifEmail:    true,
      notifTelegram: false,
      telegramChatId:null,
    },
    ...overrides,
  }
}

describe('alertaEngine.processarAlertasParaLicitacao', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve disparar alerta quando palavra-chave bate no objeto', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao() as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([makeAlerta()] as any)
    vi.mocked(prisma.notificacao.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.notificacao.create).mockResolvedValue({ id: 'notif-001', usuario: makeAlerta().usuario } as any)
    vi.mocked(prisma.notificacao.update).mockResolvedValue({} as any)
    vi.mocked(prisma.alertaConfig.findUnique).mockResolvedValue({ nome: 'Material SP' } as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(1)
    expect(prisma.notificacao.create).toHaveBeenCalledTimes(1)
  })

  it('não deve disparar quando a UF não bate', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao({ uf: 'RJ' }) as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([makeAlerta({ ufs: ['SP'] })] as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(0)
    expect(prisma.notificacao.create).not.toHaveBeenCalled()
  })

  it('não deve disparar quando modalidade não bate', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao() as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([
      makeAlerta({ modalidades: ['CONCORRENCIA'] }),
    ] as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(0)
  })

  it('não deve disparar quando valor está fora do range', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao({ valorEstimado: 50000 }) as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([
      makeAlerta({ valorMin: 100000, valorMax: null }),
    ] as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(0)
  })

  it('não deve disparar quando palavra-chave não está no texto', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao() as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([
      makeAlerta({ palavrasChave: ['pavimentação'] }),
    ] as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(0)
  })

  it('não deve disparar quando já existe notificação enviada', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao() as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([makeAlerta()] as any)
    vi.mocked(prisma.notificacao.findFirst).mockResolvedValue({ id: 'notif-existente', status: 'ENVIADO' } as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(0)
  })

  it('deve funcionar com alerta sem filtros (captura tudo)', async () => {
    vi.mocked(prisma.licitacao.findUniqueOrThrow).mockResolvedValue(makeLicitacao() as any)
    vi.mocked(prisma.alertaConfig.findMany).mockResolvedValue([
      makeAlerta({ palavrasChave: [], ufs: [], modalidades: [], portais: [] }),
    ] as any)
    vi.mocked(prisma.notificacao.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.notificacao.create).mockResolvedValue({ id: 'notif-001', usuario: makeAlerta().usuario } as any)
    vi.mocked(prisma.notificacao.update).mockResolvedValue({} as any)
    vi.mocked(prisma.alertaConfig.findUnique).mockResolvedValue({ nome: 'Sem filtro' } as any)

    const matches = await processarAlertasParaLicitacao('lic-001')
    expect(matches).toBe(1)
  })
})
