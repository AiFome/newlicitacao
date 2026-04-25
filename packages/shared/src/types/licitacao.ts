// packages/shared/src/types/licitacao.ts

export interface LicitacaoDTO {
  id: string
  numeroEdital: string
  titulo: string
  objeto: string
  modalidade: string
  situacao: string
  valorEstimado: number | null
  dataPublicacao: string
  dataAbertura: string
  dataEncerramento: string | null
  linkEdital: string
  portalOrigem: string
  uf: string
  municipio: string | null
  orgao: {
    id: string
    cnpj: string
    razaoSocial: string
    esfera: string
    uf: string
  }
  anexos: AnexoDTO[]
  createdAt: string
}

export interface AnexoDTO {
  id: string
  nomeArquivo: string
  urlOriginal: string
  urlStorage: string | null
  tipoArquivo: string
  tamanhoBytes: number | null
}

export interface BuscaLicitacaoParams {
  q?: string
  modalidade?: string[]
  portal?: string[]
  uf?: string[]
  situacao?: string[]
  valorMin?: number
  valorMax?: number
  dataAberturaDe?: string
  dataAberturaAte?: string
  page?: number
  limit?: number
  sort?: 'recentes' | 'abertura' | 'valor_asc' | 'valor_desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AlertaConfigDTO {
  id: string
  nome: string
  palavrasChave: string[]
  modalidades: string[]
  portais: string[]
  ufs: string[]
  valorMin: number | null
  valorMax: number | null
  canal: string[]
  frequencia: string
  ativo: boolean
}

export interface UsuarioDTO {
  id: string
  email: string
  nome: string
  plano: string
  ativo: boolean
  notifEmail: boolean
  notifTelegram: boolean
  notifPush: boolean
  trialAte: string | null
  createdAt: string
}
