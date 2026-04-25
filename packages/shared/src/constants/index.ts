// packages/shared/src/constants/index.ts

export const PORTAIS = {
  PNCP: 'PNCP',
  COMPRASNET: 'COMPRASNET',
  LICITACOES_E: 'LICITACOES_E',
  BLL: 'BLL',
  BNC: 'BNC',
  LICITANET: 'LICITANET',
  PORTAL_COMPRAS_PUBLICAS: 'PORTAL_COMPRAS_PUBLICAS',
  LICITARDIGITAL: 'LICITARDIGITAL',
  BBMNET: 'BBMNET',
  NEGOCIOS_PUBLICOS: 'NEGOCIOS_PUBLICOS',
  SOL_LICITACOES: 'SOL_LICITACOES',
  EQUIPLANO: 'EQUIPLANO',
  CITACON: 'CITACON',
  LICITACON: 'LICITACON',
} as const

export const PORTAIS_LABELS: Record<string, string> = {
  PNCP: 'PNCP',
  COMPRASNET: 'Comprasnet',
  LICITACOES_E: 'Licitações-e',
  BLL: 'BLL',
  BNC: 'BNC',
  LICITANET: 'LicitaNet',
  PORTAL_COMPRAS_PUBLICAS: 'Portal de Compras Públicas',
  LICITARDIGITAL: 'LicitarDigital',
  BBMNET: 'BBMNet',
  NEGOCIOS_PUBLICOS: 'Negócios Públicos',
  SOL_LICITACOES: 'Sol Licitações',
  EQUIPLANO: 'Equiplano',
  CITACON: 'Citacon',
  LICITACON: 'LicitaCon',
}

export const MODALIDADES_LABELS: Record<string, string> = {
  PREGAO_ELETRONICO: 'Pregão Eletrônico',
  PREGAO_PRESENCIAL: 'Pregão Presencial',
  CONCORRENCIA: 'Concorrência',
  TOMADA_DE_PRECOS: 'Tomada de Preços',
  CONVITE: 'Convite',
  LEILAO: 'Leilão',
  CONCURSO: 'Concurso',
  DISPENSA: 'Dispensa',
  INEXIGIBILIDADE: 'Inexigibilidade',
  RDC: 'RDC',
  CREDENCIAMENTO: 'Credenciamento',
}

export const SITUACOES_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  SUSPENSA: 'Suspensa',
  REVOGADA: 'Revogada',
  ANULADA: 'Anulada',
  HOMOLOGADA: 'Homologada',
  DESERTA: 'Deserta',
  FRACASSADA: 'Fracassada',
  ENCERRADA: 'Encerrada',
}

export const PLANOS = {
  FREE: {
    nome: 'Gratuito',
    alertas: 1,
    palavrasChave: 3,
    portais: ['PNCP'],
    exportacao: false,
    downloads: 5,
  },
  BASICO: {
    nome: 'Básico',
    alertas: 5,
    palavrasChave: 10,
    portais: ['PNCP', 'COMPRASNET', 'LICITACOES_E', 'BLL', 'BNC', 'NEGOCIOS_PUBLICOS'],
    exportacao: false,
    downloads: 50,
  },
  PROFISSIONAL: {
    nome: 'Profissional',
    alertas: 30,
    palavrasChave: 50,
    portais: Object.keys(PORTAIS),
    exportacao: true,
    downloads: -1, // ilimitado
  },
  ENTERPRISE: {
    nome: 'Enterprise',
    alertas: -1,
    palavrasChave: -1,
    portais: Object.keys(PORTAIS),
    exportacao: true,
    downloads: -1,
  },
} as const

export const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const
