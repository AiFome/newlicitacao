'use client'
// apps/web/src/app/(admin)/usuarios/page.tsx
import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { adminApi, type AdminUsuario, type AdminUsuarioDetalhe } from '@/lib/admin-api'
import { formatDataHora } from '@/lib/format'
import {
  Search, MoreVertical, Shield, ShieldOff, UserX, Mail,
  LogOut, Edit3, ChevronLeft, ChevronRight, X, Check,
  UserCheck, AlertCircle, Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'

const PLANO_COR: Record<string, string> = {
  FREE:          'bg-surface-muted text-muted',
  BASICO:        'bg-blue-50 text-blue-700',
  PROFISSIONAL:  'bg-green-50 text-green-700',
  ENTERPRISE:    'bg-purple-50 text-purple-700',
}
const ROLE_COR: Record<string, string> = {
  USER:        'bg-surface-muted text-muted',
  ADMIN:       'bg-amber-50 text-amber-700',
  SUPER_ADMIN: 'bg-red-50 text-red-700',
}

function DrawerDetalhe({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading, mutate } = useSWR(`admin-user-${id}`, () => adminApi.usuarios.detalhe(id))
  const { usuario: meAdmin } = useAuthStore()
  const isSuperAdmin = meAdmin?.role === 'SUPER_ADMIN'

  async function acao(fn: () => Promise<any>, msg: string) {
    try {
      await fn()
      toast.success(msg)
      mutate()
    } catch (e: any) {
      toast.error(e.message ?? 'Erro')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-surface-border flex items-center justify-between px-6 py-4 z-10">
          <h2 className="font-display text-base font-700 text-text">Detalhe do usuário</h2>
          <button onClick={onClose} className="text-muted hover:text-text"><X size={20} /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : data ? (
          <div className="p-6 space-y-6">

            {/* Info principal */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-brand-50 flex items-center justify-center text-lg font-700 text-brand-700 uppercase shrink-0">
                {data.nome[0]}
              </div>
              <div className="flex-1">
                <p className="font-600 text-text">{data.nome}</p>
                <p className="text-sm text-muted">{data.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={clsx('text-[10px] font-600 px-2 py-0.5 rounded-full', PLANO_COR[data.plano])}>{data.plano}</span>
                  <span className={clsx('text-[10px] font-600 px-2 py-0.5 rounded-full', ROLE_COR[data.role])}>{data.role}</span>
                  {!data.ativo && <span className="text-[10px] font-600 px-2 py-0.5 rounded-full bg-red-50 text-red-600">INATIVO</span>}
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Alertas',       value: data._count.alertas },
                { label: 'Favoritos',     value: data._count.favoritos },
                { label: 'Sessões',       value: data._count.sessoes },
                { label: 'Notificações', value: data._count.notificacoes },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-surface-muted p-3 text-center">
                  <p className="text-lg font-700 text-text">{value}</p>
                  <p className="text-[10px] text-muted">{label}</p>
                </div>
              ))}
            </div>

            {/* Ações */}
            <div className="space-y-2">
              <p className="text-[10px] font-600 text-muted uppercase tracking-wide">Ações rápidas</p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => acao(() => adminApi.usuarios.atualizar(data.id, { ativo: !data.ativo }), data.ativo ? 'Usuário desativado' : 'Usuário ativado')}
                  className={clsx('btn-ghost text-xs gap-1.5 justify-center', !data.ativo && 'text-green-600')}
                >
                  {data.ativo ? <><UserX size={13} /> Desativar</> : <><UserCheck size={13} /> Ativar</>}
                </button>

                <button
                  onClick={() => acao(() => adminApi.usuarios.logout(data.id), 'Sessões encerradas')}
                  className="btn-ghost text-xs gap-1.5 justify-center"
                >
                  <LogOut size={13} /> Forçar logout
                </button>

                <button
                  onClick={() => acao(() => adminApi.usuarios.resetSenha(data.id), 'E-mail de reset enviado')}
                  className="btn-ghost text-xs gap-1.5 justify-center"
                >
                  <Mail size={13} /> Reset senha
                </button>

                {!data.emailVerificado && (
                  <button
                    onClick={() => acao(() => adminApi.usuarios.atualizar(data.id, { emailVerificado: true }), 'E-mail verificado manualmente')}
                    className="btn-ghost text-xs gap-1.5 justify-center text-green-600"
                  >
                    <Check size={13} /> Verificar e-mail
                  </button>
                )}
              </div>

              {/* Alterar plano */}
              <div className="rounded-lg border border-surface-border p-3">
                <p className="text-xs font-600 text-text mb-2">Alterar plano</p>
                <div className="flex gap-2 flex-wrap">
                  {['FREE','BASICO','PROFISSIONAL','ENTERPRISE'].map((plano) => (
                    <button
                      key={plano}
                      onClick={() => acao(() => adminApi.usuarios.atualizar(data.id, { plano }), `Plano alterado para ${plano}`)}
                      className={clsx(
                        'text-[10px] font-600 px-2.5 py-1 rounded-full border transition-all',
                        data.plano === plano
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'border-surface-border text-muted hover:border-brand-400 hover:text-brand-600'
                      )}
                    >
                      {plano}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alterar role (apenas Super Admin) */}
              {isSuperAdmin && (
                <div className="rounded-lg border border-surface-border p-3">
                  <p className="text-xs font-600 text-text mb-2">Alterar role</p>
                  <div className="flex gap-2">
                    {['USER','ADMIN','SUPER_ADMIN'].map((role) => (
                      <button
                        key={role}
                        onClick={() => acao(() => adminApi.usuarios.atualizar(data.id, { role }), `Role alterado para ${role}`)}
                        className={clsx(
                          'text-[10px] font-600 px-2.5 py-1 rounded-full border transition-all',
                          data.role === role
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'border-surface-border text-muted hover:border-amber-400'
                        )}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alertas do usuário */}
            {data.alertas.length > 0 && (
              <div>
                <p className="text-[10px] font-600 text-muted uppercase tracking-wide mb-2">Alertas configurados</p>
                <div className="space-y-1.5">
                  {data.alertas.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-text">
                      <span className={clsx('h-1.5 w-1.5 rounded-full shrink-0', a.ativo ? 'bg-green-500' : 'bg-surface-muted')} />
                      <span className="font-500">{a.nome}</span>
                      <span className="text-muted truncate">{a.palavrasChave.slice(0,3).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="text-xs text-muted space-y-0.5 pt-2 border-t border-surface-border">
              <p>Cadastrado em: {formatDataHora(data.createdAt)}</p>
              {data.trialAte && <p>Trial até: {formatDataHora(data.trialAte)}</p>}
              {data.telegramChatId && <p>Telegram: {data.telegramChatId}</p>}
              {data.stripeCustomerId && <p>Stripe ID: {data.stripeCustomerId}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted">
            <AlertCircle size={24} />
            <p className="text-sm">Usuário não encontrado</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUsuariosPage() {
  const [page, setPage]     = useState(1)
  const [busca, setBusca]   = useState('')
  const [plano, setPlano]   = useState('')
  const [role, setRole]     = useState('')
  const [ativo, setAtivo]   = useState('')
  const [detalheId, setDetalheId] = useState<string | null>(null)

  const params: Record<string, string | number> = { page, limit: 20 }
  if (busca) params['busca'] = busca
  if (plano) params['plano'] = plano
  if (role)  params['role']  = role
  if (ativo) params['ativo'] = ativo

  const { data, isLoading, mutate } = useSWR(
    ['admin-usuarios', page, busca, plano, role, ativo],
    () => adminApi.usuarios.listar(params),
    { keepPreviousData: true }
  )

  return (
    <div className="space-y-5">
      {detalheId && <DrawerDetalhe id={detalheId} onClose={() => { setDetalheId(null); mutate() }} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Usuários</h1>
          <p className="text-sm text-muted">{data?.total.toLocaleString('pt-BR') ?? '—'} cadastrados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1) }}
            placeholder="Buscar por nome ou e-mail…"
            className="input pl-8 text-sm h-9"
          />
        </div>

        {[
          { value: plano, onChange: (v: string) => { setPlano(v); setPage(1) }, opts: [['','Todos os planos'],['FREE','Free'],['BASICO','Básico'],['PROFISSIONAL','Profissional'],['ENTERPRISE','Enterprise']] },
          { value: role,  onChange: (v: string) => { setRole(v); setPage(1) },  opts: [['','Todos os roles'],['USER','User'],['ADMIN','Admin'],['SUPER_ADMIN','Super Admin']] },
          { value: ativo, onChange: (v: string) => { setAtivo(v); setPage(1) }, opts: [['','Todos'],['true','Ativos'],['false','Inativos']] },
        ].map(({ value, onChange, opts }, i) => (
          <select key={i} value={value} onChange={(e) => onChange(e.target.value)} className="input text-sm h-9 pr-8">
            {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Tabela */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/50">
              {['Nome / E-mail','Plano','Role','Status','Alertas','Cadastro',''].map((h) => (
                <th key={h} className="text-left text-[10px] font-600 text-muted uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-surface-border/50">
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-3 bg-surface-muted rounded animate-pulse" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && data?.data.map((u) => (
              <tr
                key={u.id}
                className="border-b border-surface-border/50 hover:bg-surface-muted/30 cursor-pointer"
                onClick={() => setDetalheId(u.id)}
              >
                <td className="px-4 py-3">
                  <p className="font-500 text-text">{u.nome}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('text-[10px] font-600 px-2 py-0.5 rounded-full', PLANO_COR[u.plano])}>{u.plano}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={clsx('text-[10px] font-600 px-2 py-0.5 rounded-full', ROLE_COR[u.role])}>{u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('h-2 w-2 rounded-full', u.ativo ? 'bg-green-500' : 'bg-red-400')} />
                    <span className="text-xs text-muted">{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted text-xs">{u._count.alertas}</td>
                <td className="px-4 py-3 text-muted text-xs">{formatDataHora(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <button className="text-muted hover:text-text p-1 rounded" onClick={(e) => { e.stopPropagation(); setDetalheId(u.id) }}>
                    <MoreVertical size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
          <p className="text-xs text-muted">
            {data ? `${((page-1)*20)+1}–${Math.min(page*20, data.total)} de ${data.total.toLocaleString('pt-BR')}` : ''}
          </p>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost px-2 py-1 text-xs">
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1 text-xs font-500 text-text">{page} / {data?.totalPages ?? 1}</span>
            <button onClick={() => setPage((p) => p+1)} disabled={page >= (data?.totalPages ?? 1)} className="btn-ghost px-2 py-1 text-xs">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
