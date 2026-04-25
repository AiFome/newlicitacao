// apps/web/src/lib/format.ts
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatMoeda(valor: number | null | undefined): string {
  if (valor == null) return 'Não informado'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatMoedaCompacta(valor: number | null | undefined): string {
  if (valor == null) return '—'
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`
  if (valor >= 1_000)     return `R$ ${(valor / 1_000).toFixed(0)}K`
  return formatMoeda(valor)
}

export function formatData(data: string | Date | null | undefined): string {
  if (!data) return '—'
  return format(typeof data === 'string' ? parseISO(data) : data, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDataHora(data: string | Date | null | undefined): string {
  if (!data) return '—'
  return format(typeof data === 'string' ? parseISO(data) : data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelativo(data: string | Date | null | undefined): string {
  if (!data) return '—'
  return formatDistanceToNow(typeof data === 'string' ? parseISO(data) : data, { locale: ptBR, addSuffix: true })
}

export const MODALIDADE_LABEL: Record<string, string> = {
  PREGAO_ELETRONICO:      'Pregão Eletrônico',
  PREGAO_PRESENCIAL:      'Pregão Presencial',
  CONCORRENCIA:           'Concorrência',
  TOMADA_DE_PRECOS:       'Tomada de Preços',
  CONVITE:                'Convite',
  LEILAO:                 'Leilão',
  CONCURSO:               'Concurso',
  DISPENSA:               'Dispensa',
  INEXIGIBILIDADE:        'Inexigibilidade',
  RDC:                    'RDC',
  CREDENCIAMENTO:         'Credenciamento',
  MANIFESTACAO_INTERESSE: 'Manifestação de Interesse',
}

export const PORTAL_LABEL: Record<string, string> = {
  PNCP:                    'PNCP',
  COMPRASNET:              'Comprasnet',
  LICITACOES_E:            'Licitações-e',
  BLL:                     'BLL',
  BNC:                     'BNC',
  LICITANET:               'LicitaNet',
  PORTAL_COMPRAS_PUBLICAS: 'Portal Compras Públicas',
  LICITARDIGITAL:          'LicitarDigital',
  BBMNET:                  'BBMNet',
  NEGOCIOS_PUBLICOS:       'Negócios Públicos',
  SOL_LICITACOES:          'Sol Licitações',
  EQUIPLANO:               'Equiplano',
  CITACON:                 'Citacon',
  LICITACON:               'LicitaCon',
}

export const SITUACAO_LABEL: Record<string, string> = {
  ABERTA:      'Aberta',
  SUSPENSA:    'Suspensa',
  REVOGADA:    'Revogada',
  ANULADA:     'Anulada',
  HOMOLOGADA:  'Homologada',
  DESERTA:     'Deserta',
  FRACASSADA:  'Fracassada',
  ENCERRADA:   'Encerrada',
}

export function situacaoBadgeClass(situacao: string): string {
  const map: Record<string, string> = {
    ABERTA:     'badge-aberta',
    SUSPENSA:   'badge-suspensa',
    HOMOLOGADA: 'badge-homologada',
  }
  return map[situacao] ?? 'badge-encerrada'
}
