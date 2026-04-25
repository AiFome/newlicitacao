// apps/web/src/lib/api.ts

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('licitabr:token')
}

type RequestOptions = RequestInit & { auth?: boolean }

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, ...init } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }

  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const resp = await fetch(`${BASE}${path}`, { ...init, headers })

  if (resp.status === 401) {
    // Token expirado — limpa e redireciona
    localStorage.removeItem('licitabr:token')
    localStorage.removeItem('licitabr:usuario')
    window.location.href = '/login'
    throw new Error('Sessão expirada')
  }

  const data = await resp.json().catch(() => ({}))

  if (!resp.ok) {
    throw new Error(data?.error ?? `Erro ${resp.status}`)
  }

  return data as T
}

// ── Auth ────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, senha: string) =>
    request<{ token: string; usuario: Usuario }>('/v1/auth/login', {
      method: 'POST', body: JSON.stringify({ email, senha }), auth: false,
    }),

  register: (nome: string, email: string, senha: string) =>
    request<{ token: string; usuario: Usuario }>('/v1/auth/register', {
      method: 'POST', body: JSON.stringify({ nome, email, senha }), auth: false,
    }),

  me:    () => request<Usuario>('/v1/auth/me'),
  logout: () => request('/v1/auth/logout', { method: 'POST' }),
}

// ── Licitações ──────────────────────────────────────────
export const licitacoesApi = {
  buscar: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v))
    })
    return request<PaginatedResult<Licitacao>>(`/v1/licitacoes?${qs}`)
  },

  get: (id: string) => request<Licitacao>(`/v1/licitacoes/${id}`),

  similares: (id: string) => request<Licitacao[]>(`/v1/licitacoes/${id}/similares`),
}

// ── Alertas ─────────────────────────────────────────────
export const alertasApi = {
  listar:  () => request<AlertaConfig[]>('/v1/alertas'),
  criar:   (data: Partial<AlertaConfig>) =>
    request<AlertaConfig>('/v1/alertas', { method: 'POST', body: JSON.stringify(data) }),
  atualizar: (id: string, data: Partial<AlertaConfig>) =>
    request<AlertaConfig>(`/v1/alertas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletar: (id: string) =>
    request(`/v1/alertas/${id}`, { method: 'DELETE' }),
  testar:  (id: string) =>
    request<{ total: number; amostra: Licitacao[] }>(`/v1/alertas/${id}/testar`, { method: 'POST' }),
}

// ── Favoritos ───────────────────────────────────────────
export const favoritosApi = {
  listar:  () => request<Favorito[]>('/v1/favoritos'),
  ids:     () => request<{ id: string; licitacaoId: string }[]>('/v1/favoritos/ids'),
  adicionar: (licitacaoId: string, nota?: string, tags?: string[]) =>
    request<Favorito>('/v1/favoritos', {
      method: 'POST',
      body: JSON.stringify({ licitacaoId, nota, tags: tags ?? [] }),
    }),
  atualizar: (id: string, dados: { nota?: string | null; tags?: string[] }) =>
    request<Favorito>(`/v1/favoritos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }),
  remover: (id: string) =>
    request(`/v1/favoritos/${id}`, { method: 'DELETE' }),
  removerPorLicitacao: (licitacaoId: string) =>
    request(`/v1/favoritos/licitacao/${licitacaoId}`, { method: 'DELETE' }),
}

// ── Usuário ─────────────────────────────────────────────
export const usuarioApi = {
  me: () => request<Usuario>('/v1/usuarios/me'),
  atualizar: (data: Partial<Pick<Usuario,
    'nome' | 'notifEmail' | 'notifTelegram' | 'notifPush'
  > & { telefone?: string | null; telegramChatId?: string | null }>) =>
    request<Usuario>('/v1/usuarios/me', { method: 'PATCH', body: JSON.stringify(data) }),
  alterarSenha: (senhaAtual: string, novaSenha: string) =>
    request<{ ok: boolean; mensagem: string }>(
      '/v1/usuarios/me/senha',
      { method: 'PUT', body: JSON.stringify({ senhaAtual, novaSenha }) }
    ),
  stats: () => request<{
    alertasAtivos: number
    totalFavoritos: number
    totalNotificacoes: number
    ultimaNotificacaoEm: string | null
  }>('/v1/usuarios/me/stats'),
  excluirConta: () => request('/v1/usuarios/me', { method: 'DELETE' }),
  sessoes: () => request<{
    id: string; userAgent: string | null; ip: string | null
    createdAt: string; expiresAt: string
  }[]>('/v1/usuarios/me/sessoes'),
  revogarSessao: (id: string) =>
    request(`/v1/usuarios/me/sessoes/${id}`, { method: 'DELETE' }),
  revogarTodasSessoes: () =>
    request('/v1/usuarios/me/sessoes', { method: 'DELETE' }),
}

// ── Tipos locais simplificados ──────────────────────────
export interface Usuario {
  id: string
  email: string
  nome: string
  telefone?: string | null
  plano: string
  ativo: boolean
  emailVerificado: boolean
  role: string
  notifEmail: boolean
  notifTelegram: boolean
  notifPush: boolean
  telegramChatId?: string | null
  trialAte: string | null
  stripeCustomerId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Licitacao {
  id: string; numeroEdital: string; titulo: string; objeto: string
  modalidade: string; situacao: string
  valorEstimado: number | null; valorHomologado: number | null
  dataPublicacao: string; dataAbertura: string; dataEncerramento: string | null
  linkEdital: string; portalOrigem: string; uf: string; municipio: string | null
  orgao: { id: string; razaoSocial: string; cnpj: string; esfera: string; uf: string }
  anexos: { id: string; nomeArquivo: string; tipoArquivo: string; urlStorage: string | null; tamanhoBytes: number | null }[]
  itens?: { id: string; descricao: string; quantidade: number; unidade: string; valorTotal: number | null }[]
  createdAt: string
}

export interface AlertaConfig {
  id: string; nome: string; palavrasChave: string[]
  modalidades: string[]; portais: string[]; ufs: string[]
  valorMin: number | null; valorMax: number | null
  canal: string[]; frequencia: string; ativo: boolean
}

export interface Favorito {
  id: string
  licitacaoId: string
  nota: string | null
  tags: string[]
  licitacao: Licitacao
  createdAt: string
}

// ── Exportação (plano Pro+) ────────────────────────────────
export const exportarApi = {
  csv: (filtros: Record<string, string> = {}) => {
    const params = new URLSearchParams({ ...filtros, formato: 'csv' })
    return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/exportar?${params}`
  },
  xlsx: (filtros: Record<string, string> = {}) => {
    const params = new URLSearchParams({ ...filtros, formato: 'xlsx' })
    return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/exportar?${params}`
  },
}
export interface PaginatedResult<T> {
  data: T[]; total: number; page: number; limit: number; totalPages: number
  fonte?: 'elasticsearch' | 'postgres'
}

