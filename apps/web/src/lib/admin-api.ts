// apps/web/src/lib/admin-api.ts
// Cliente tipado para as rotas /v1/admin/*

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function token() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('licitabr:token') ?? ''
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${BASE}/v1/admin${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token()}`,
      ...opts.headers,
    },
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
    throw new Error(err.error ?? `HTTP ${resp.status}`)
  }
  return resp.json()
}

// ── Tipos ────────────────────────────────────────────────

export interface AdminDashboard {
  usuarios: {
    total:   number
    hoje:    number
    semana:  number
    porPlano: Record<string, number>
    crescimento: Array<{ data: string; total: number }>
  }
  licitacoes: {
    total:    number
    hoje:     number
    porPortal: Array<{ portal: string; total: number }>
  }
  scrapers: {
    ultimosLogs: ScraperLog[]
    totalErros:  number
  }
  alertas:      { ativos: number }
  notificacoes: { semana: number }
  receita:      { estimadaMensal: number }
}

export interface AdminUsuario {
  id: string; nome: string; email: string; plano: string; role: string
  ativo: boolean; emailVerificado: boolean; createdAt: string
  trialAte: string | null; stripeCustomerId: string | null
  telegramChatId: string | null; notifEmail: boolean; notifTelegram: boolean
  _count: { alertas: number; favoritos: number; sessoes: number }
}

export interface AdminUsuarioDetalhe extends AdminUsuario {
  telefone: string | null; avatarUrl: string | null; updatedAt: string
  alertas:   Array<{ id: string; nome: string; ativo: boolean; palavrasChave: string[]; createdAt: string }>
  favoritos: Array<{ id: string; createdAt: string; licitacao: { titulo: string } }>
  sessoes:   Array<{ id: string; ip: string; userAgent: string; createdAt: string; expiresAt: string }>
  _count: { alertas: number; favoritos: number; sessoes: number; notificacoes: number }
}

export interface AdminLicitacao {
  id: string; numeroEdital: string; titulo: string; modalidade: string
  situacao: string; portalOrigem: string; uf: string; municipio: string | null
  valorEstimado: number | null; dataAbertura: string; createdAt: string
  indexadoEm: string | null; orgao: { razaoSocial: string }
  _count: { favoritos: number }
}

export interface ScraperLog {
  id: string; portal: string; status: string
  totalColetados: number; totalNovos: number; totalAtualizados: number; totalErros: number
  duracao: number | null; erro: string | null; iniciadoEm: string; finalizadoEm: string | null
}

export interface AdminNotificacao {
  id: string; canal: string; status: string; erro: string | null; enviadoEm: string | null; createdAt: string
  usuario: { nome: string; email: string }
  licitacao: { titulo: string }
}

export interface Paginated<T> {
  data: T[]; total: number; page: number; totalPages: number
}

// ── API calls ─────────────────────────────────────────────

export const adminApi = {
  dashboard: () => req<AdminDashboard>('/dashboard'),

  usuarios: {
    listar:     (params?: Record<string, string | number>) => req<Paginated<AdminUsuario>>('/usuarios?' + new URLSearchParams(params as any)),
    detalhe:    (id: string)              => req<AdminUsuarioDetalhe>(`/usuarios/${id}`),
    atualizar:  (id: string, data: any)  => req<AdminUsuario>(`/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    deletar:    (id: string)             => req<{ ok: boolean }>(`/usuarios/${id}`, { method: 'DELETE' }),
    logout:     (id: string)             => req<{ ok: boolean }>(`/usuarios/${id}/logout`, { method: 'POST' }),
    resetSenha: (id: string)             => req<{ ok: boolean }>(`/usuarios/${id}/reset-senha`, { method: 'POST' }),
  },

  licitacoes: {
    listar:     (params?: Record<string, string | number>) => req<Paginated<AdminLicitacao>>('/licitacoes?' + new URLSearchParams(params as any)),
    deletar:    (id: string)  => req<{ ok: boolean }>(`/licitacoes/${id}`, { method: 'DELETE' }),
    reindexar:  (id: string)  => req<{ ok: boolean }>(`/licitacoes/${id}/reindexar`, { method: 'POST' }),
  },

  scrapers: {
    logs:     (params?: Record<string, string | number>) => req<Paginated<ScraperLog>>('/scrapers/logs?' + new URLSearchParams(params as any)),
    stats:    ()              => req<any>('/scrapers/stats'),
    disparar: (data: { portal: string; paginas?: number; uf?: string }) =>
              req<{ ok: boolean; message: string }>('/scrapers/disparar', { method: 'POST', body: JSON.stringify(data) }),
  },

  notificacoes: {
    listar: (params?: Record<string, string | number>) => req<Paginated<AdminNotificacao>>('/notificacoes?' + new URLSearchParams(params as any)),
  },

  alertas: {
    listar: (params?: Record<string, string | number>) => req<Paginated<any>>('/alertas?' + new URLSearchParams(params as any)),
  },

  sistema: {
    saude:  () => req<any>('/sistema/saude'),
    config: () => req<any>('/sistema/config'),
  },
}
