'use client'
// apps/web/src/app/(admin)/notificacoes/page.tsx
import { useState } from 'react'
import useSWR from 'swr'
import { adminApi } from '@/lib/admin-api'
import { formatDataHora } from '@/lib/format'
import { RefreshCw, ChevronLeft, ChevronRight, Mail, MessageCircle, Bell } from 'lucide-react'
import clsx from 'clsx'

const STATUS_COR: Record<string, string> = {
  ENVIADO:   'bg-green-50 text-green-700 border-green-200',
  PENDENTE:  'bg-amber-50 text-amber-700 border-amber-200',
  FALHOU:    'bg-red-50 text-red-700 border-red-200',
  CANCELADO: 'bg-surface-muted text-muted border-surface-border',
}

const CANAL_ICON: Record<string, React.ElementType> = {
  EMAIL:    Mail,
  TELEGRAM: MessageCircle,
  PUSH:     Bell,
  WEBHOOK:  Bell,
}

export default function AdminNotificacoesPage() {
  const [page, setPage]   = useState(1)
  const [status, setSt]   = useState('')
  const [canal, setCan]   = useState('')
  const [aba, setAba]     = useState<'notificacoes'|'alertas'>('notificacoes')

  const { data: notifs, isLoading: loadN, mutate: mutN } = useSWR(
    ['admin-notifs', page, status, canal],
    () => adminApi.notificacoes.listar({ page, limit: 25, status, canal }),
    { keepPreviousData: true }
  )

  const { data: alertas, isLoading: loadA } = useSWR(
    aba === 'alertas' ? ['admin-alertas', page] : null,
    () => adminApi.alertas.listar({ page, limit: 25 }),
    { keepPreviousData: true }
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Notificações</h1>
          <p className="text-sm text-muted">Histórico de envios e alertas configurados pelos usuários</p>
        </div>
        <button onClick={() => mutN()} className="btn-ghost text-xs gap-1.5">
          <RefreshCw size={13} className={loadN ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-surface-border">
        {(['notificacoes','alertas'] as const).map((a) => (
          <button
            key={a}
            onClick={() => { setAba(a); setPage(1) }}
            className={clsx(
              'px-4 py-2.5 text-sm font-500 border-b-2 -mb-px transition-colors',
              aba === a ? 'border-brand-600 text-brand-700' : 'border-transparent text-muted hover:text-text'
            )}
          >
            {a === 'notificacoes' ? 'Notificações enviadas' : 'Alertas globais'}
          </button>
        ))}
      </div>

      {aba === 'notificacoes' && (
        <>
          {/* Filtros */}
          <div className="card p-4 flex flex-wrap gap-3">
            <select value={status} onChange={(e) => { setSt(e.target.value); setPage(1) }} className="input text-sm h-9 pr-8">
              <option value="">Todos os status</option>
              <option value="ENVIADO">Enviado</option>
              <option value="PENDENTE">Pendente</option>
              <option value="FALHOU">Falhou</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <select value={canal} onChange={(e) => { setCan(e.target.value); setPage(1) }} className="input text-sm h-9 pr-8">
              <option value="">Todos os canais</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="PUSH">Push</option>
            </select>
            <span className="text-xs text-muted self-center ml-auto">{notifs?.total ?? 0} registros</span>
          </div>

          {/* Tabela de notificações */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/50">
                  {['Usuário','Licitação','Canal','Status','Enviado em',''].map((h) => (
                    <th key={h} className="text-left text-[10px] font-600 text-muted uppercase tracking-wide px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadN && Array.from({length:10}).map((_,i) => (
                  <tr key={i} className="border-b border-surface-border/50">
                    {Array.from({length:6}).map((_,j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-surface-muted rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))}
                {!loadN && notifs?.data.map((n) => {
                  const CanalIcon = CANAL_ICON[n.canal] ?? Bell
                  return (
                    <tr key={n.id} className="border-b border-surface-border/50 hover:bg-surface-muted/30">
                      <td className="px-4 py-2.5">
                        <p className="font-500 text-text text-xs">{n.usuario.nome}</p>
                        <p className="text-[10px] text-muted">{n.usuario.email}</p>
                      </td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <p className="text-xs text-text truncate">{n.licitacao.titulo}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <CanalIcon size={12} /> {n.canal}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('text-[10px] font-600 px-2 py-0.5 rounded-full border', STATUS_COR[n.status] ?? STATUS_COR['CANCELADO'])}>
                          {n.status}
                        </span>
                        {n.erro && <p className="text-[10px] text-red-500 mt-0.5 truncate max-w-[120px]">{n.erro}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">
                        {n.enviadoEm ? formatDataHora(n.enviadoEm) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted">{formatDataHora(n.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
              <p className="text-xs text-muted">{notifs?.total ?? 0} registros</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p)=>Math.max(1,p-1))} disabled={page===1} className="btn-ghost px-2 py-1 text-xs"><ChevronLeft size={14} /></button>
                <span className="px-3 py-1 text-xs font-500 text-text">{page}/{notifs?.totalPages??1}</span>
                <button onClick={() => setPage((p)=>p+1)} disabled={page>=(notifs?.totalPages??1)} className="btn-ghost px-2 py-1 text-xs"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {aba === 'alertas' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted/50">
                {['Nome / Usuário','Palavras-chave','Portais','Canal','Freq.','Status'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-600 text-muted uppercase tracking-wide px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadA && Array.from({length:10}).map((_,i) => (
                <tr key={i} className="border-b border-surface-border/50">
                  {Array.from({length:6}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-3 bg-surface-muted rounded animate-pulse" /></td>)}
                </tr>
              ))}
              {!loadA && alertas?.data.map((a: any) => (
                <tr key={a.id} className="border-b border-surface-border/50 hover:bg-surface-muted/30">
                  <td className="px-4 py-2.5">
                    <p className="font-500 text-text text-xs">{a.nome}</p>
                    <p className="text-[10px] text-muted">{a.usuario.email} · {a.usuario.plano}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted max-w-[160px] truncate">{a.palavrasChave.join(', ') || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{a.portais.length > 0 ? a.portais.length : 'Todos'}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{a.canal.join(', ')}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{a.frequencia}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('h-2 w-2 rounded-full inline-block', a.ativo ? 'bg-green-500' : 'bg-red-400')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <p className="text-xs text-muted">{alertas?.total ?? 0} alertas</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p)=>Math.max(1,p-1))} disabled={page===1} className="btn-ghost px-2 py-1 text-xs"><ChevronLeft size={14}/></button>
              <span className="px-3 py-1 text-xs font-500 text-text">{page}/{alertas?.totalPages??1}</span>
              <button onClick={() => setPage((p)=>p+1)} disabled={page>=(alertas?.totalPages??1)} className="btn-ghost px-2 py-1 text-xs"><ChevronRight size={14}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
