// apps/web/src/lib/__tests__/format.test.ts
import { describe, it, expect } from 'vitest'
import {
  formatMoeda,
  formatMoedaCompacta,
  formatData,
  formatDataHora,
  formatRelativo,
  MODALIDADE_LABEL,
  PORTAL_LABEL,
  SITUACAO_LABEL,
  situacaoBadgeClass,
} from '../format.js'

describe('formatMoeda', () => {
  it('formata valores em reais', () => {
    expect(formatMoeda(1000)).toBe('R$\u00a01.000,00')
    expect(formatMoeda(1234567.89)).toContain('1.234.567')
  })

  it('retorna "Não informado" para null/undefined', () => {
    expect(formatMoeda(null)).toBe('Não informado')
    expect(formatMoeda(undefined)).toBe('Não informado')
  })

  it('formata zero corretamente', () => {
    expect(formatMoeda(0)).toContain('0,00')
  })
})

describe('formatMoedaCompacta', () => {
  it('abrevia milhões', () => {
    expect(formatMoedaCompacta(1_500_000)).toBe('R$ 1.5M')
    expect(formatMoedaCompacta(2_000_000)).toBe('R$ 2.0M')
  })

  it('abrevia milhares', () => {
    expect(formatMoedaCompacta(250_000)).toBe('R$ 250K')
    expect(formatMoedaCompacta(1_000)).toBe('R$ 1K')
  })

  it('retorna "—" para null', () => {
    expect(formatMoedaCompacta(null)).toBe('—')
    expect(formatMoedaCompacta(undefined)).toBe('—')
  })
})

describe('formatData', () => {
  it('formata data no padrão brasileiro', () => {
    expect(formatData('2025-06-15')).toBe('15/06/2025')
    expect(formatData('2025-01-01')).toBe('01/01/2025')
  })

  it('aceita objeto Date', () => {
    expect(formatData(new Date(2025, 5, 15))).toBe('15/06/2025')
  })

  it('retorna "—" para null/undefined', () => {
    expect(formatData(null)).toBe('—')
    expect(formatData(undefined)).toBe('—')
  })
})

describe('formatDataHora', () => {
  it('formata data e hora', () => {
    const resultado = formatDataHora('2025-06-15T10:30:00')
    expect(resultado).toContain('15/06/2025')
    expect(resultado).toContain('10:30')
  })

  it('retorna "—" para null', () => {
    expect(formatDataHora(null)).toBe('—')
  })
})

describe('MODALIDADE_LABEL', () => {
  it('tem labels para todas as modalidades principais', () => {
    expect(MODALIDADE_LABEL['PREGAO_ELETRONICO']).toBe('Pregão Eletrônico')
    expect(MODALIDADE_LABEL['CONCORRENCIA']).toBe('Concorrência')
    expect(MODALIDADE_LABEL['DISPENSA']).toBe('Dispensa')
    expect(MODALIDADE_LABEL['INEXIGIBILIDADE']).toBe('Inexigibilidade')
  })
})

describe('PORTAL_LABEL', () => {
  it('tem labels para todos os portais', () => {
    expect(PORTAL_LABEL['PNCP']).toBe('PNCP')
    expect(PORTAL_LABEL['BLL']).toBe('BLL')
    expect(PORTAL_LABEL['BNC']).toBe('BNC')
    expect(PORTAL_LABEL['COMPRASNET']).toBe('Comprasnet')
  })
})

describe('situacaoBadgeClass', () => {
  it('retorna classe correta para cada situação', () => {
    expect(situacaoBadgeClass('ABERTA')).toBe('badge-aberta')
    expect(situacaoBadgeClass('SUSPENSA')).toBe('badge-suspensa')
    expect(situacaoBadgeClass('HOMOLOGADA')).toBe('badge-homologada')
  })

  it('retorna classe de encerrado para situações desconhecidas', () => {
    expect(situacaoBadgeClass('QUALQUER')).toBe('badge-encerrada')
    expect(situacaoBadgeClass('ANULADA')).toBe('badge-encerrada')
  })
})

describe('SITUACAO_LABEL', () => {
  it('tem labels em português para todas as situações', () => {
    expect(SITUACAO_LABEL['ABERTA']).toBe('Aberta')
    expect(SITUACAO_LABEL['SUSPENSA']).toBe('Suspensa')
    expect(SITUACAO_LABEL['ENCERRADA']).toBe('Encerrada')
    expect(SITUACAO_LABEL['HOMOLOGADA']).toBe('Homologada')
  })
})
