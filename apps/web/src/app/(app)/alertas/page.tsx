// apps/web/src/app/(app)/alertas/page.tsx
'use client'
import { useState } from 'react'
import { Bell, Plus, Trash2, Power, TestTube, ChevronDown, ChevronUp, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { useAlertas } from '@/hooks/useAlertas'
import { useAuthStore } from '@/lib/auth-store'
import { MODALIDADE_LABEL, PORTAL_LABEL } from '@/lib/format'
import { PLANOS } from '@licitabr/shared'
import { alertasApi, type AlertaConfig } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const CANAIS = [
  { value: 'EMAIL',    label: 'E-mail',   icon: Mail },
  { value: 'TELEGRAM', label: 'Telegram', icon: MessageSquare },
  { value: 'PUSH',     label: 'Push',     icon: Smartphone },
]

export default function AlertasPage() {
  const { usuario } = useAuthStore()
  const { alertas, isLoading, criar, deletar, alternarAtivo } = useAlertas()
  const [showForm, setShowForm] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [testandoId, setTestandoId] = useState<string | null>(null)

  const plano = (usuario?.plano ?? 'FREE') as keyof typeof PLANOS
  const limites = PLANOS[plano]
  const ativos  = alertas.filter((a) => a.ativo).length
  const podeNovo = limites.alertas === -1 || ativos < limites.alertas

  async function handleTestar(id: string) {
    setTestandoId(id)
    try {
      const r = await alertasApi.testar(id)
      toast.success(`${r.total} licitação(ões) encontrada(s) para este alerta.`)
    } catch (e) {
      toast.error('Erro ao testar alerta.')
    } finally {
      setTestandoId(null)
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="font-display text-2xl font-700 text-text tracking-tight">Alertas</h1>
          <p className="text-sm text-muted mt-1">
            Receba notificações automáticas quando novos editais forem publicados.
          </p>
        </div>
        <button
          onClick={() => podeNovo ? setShowForm((p) => !p) : toast.error('Limite de alertas atingido. Faça upgrade!')}
          className="btn-primary gap-2 shrink-0"
        >
          <Plus size={16} />
          Novo alerta
        </button>
      </div>

      {/* Uso do plano */}
      <div className="card p-4 animate-fade-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted">Alertas ativos</span>
          <span className="font-medium text-text">
            {ativos} / {limites.alertas === -1 ? '∞' : limites.alertas}
          </span>
        </div>
        {limites.alertas !== -1 && (
          <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, (ativos / limites.alertas) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Formulário novo alerta */}
      {showForm && (
        <NovoAlertaForm
          limites={limites}
          onSalvar={async (dados) => { await criar(dados); setShowForm(false) }}
          onCancelar={() => setShowForm(false)}
        />
      )}

      {/* Lista de alertas */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse-soft h-16" />
          ))}
        </div>
      ) : alertas.length === 0 ? (
        <div className="card p-12 text-center animate-fade-up">
          <Bell size={36} className="text-muted mx-auto mb-3 opacity-30" />
          <p className="text-muted text-sm">Você ainda não tem alertas configurados.</p>
          <p className="text-xs text-muted mt-1">Crie um alerta para receber editais por e-mail ou Telegram automaticamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((alerta, i) => (
            <div
              key={alerta.id}
              className="card animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* Header do card */}
              <div className="flex items-center gap-3 p-4">
                <div className={clsx('h-2.5 w-2.5 rounded-full shrink-0', alerta.ativo ? 'bg-emerald-400' : 'bg-gray-300')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">{alerta.nome}</p>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {alerta.palavrasChave.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Canais */}
                  {alerta.canal.includes('EMAIL')    && <Mail size={14} className="text-muted" />}
                  {alerta.canal.includes('TELEGRAM') && <MessageSquare size={14} className="text-muted" />}
                  {alerta.canal.includes('PUSH')     && <Smartphone size={14} className="text-muted" />}

                  <button
                    onClick={() => handleTestar(alerta.id)}
                    disabled={testandoId === alerta.id}
                    className="btn-ghost p-1.5 ml-1"
                    title="Testar alerta"
                  >
                    <TestTube size={14} />
                  </button>
                  <button
                    onClick={() => alternarAtivo(alerta.id, !alerta.ativo)}
                    className={clsx('btn-ghost p-1.5', alerta.ativo ? 'text-emerald-600' : 'text-muted')}
                    title={alerta.ativo ? 'Desativar' : 'Ativar'}
                  >
                    <Power size={14} />
                  </button>
                  <button
                    onClick={() => deletar(alerta.id)}
                    className="btn-ghost p-1.5 hover:text-red-500 hover:border-red-200"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setExpandido(expandido === alerta.id ? null : alerta.id)}
                    className="btn-ghost p-1.5"
                  >
                    {expandido === alerta.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {expandido === alerta.id && (
                <div className="px-4 pb-4 border-t border-surface-border pt-3 grid grid-cols-2 gap-3 text-xs">
                  <DetailItem label="Portais"    value={alerta.portais.map((p) => PORTAL_LABEL[p]).join(', ') || 'Todos'} />
                  <DetailItem label="Modalidades" value={alerta.modalidades.map((m) => MODALIDADE_LABEL[m]).join(', ') || 'Todas'} />
                  <DetailItem label="UFs"        value={alerta.ufs.join(', ') || 'Todas'} />
                  <DetailItem label="Frequência" value={{ IMEDIATO: 'Imediato', DIARIO: 'Diário', SEMANAL: 'Semanal' }[alerta.frequencia] ?? ''} />
                  {alerta.valorMin && <DetailItem label="Valor mín." value={`R$ ${alerta.valorMin.toLocaleString('pt-BR')}`} />}
                  {alerta.valorMax && <DetailItem label="Valor máx." value={`R$ ${alerta.valorMax.toLocaleString('pt-BR')}`} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-0.5">{label}</p>
      <p className="text-text">{value || '—'}</p>
    </div>
  )
}

function NovoAlertaForm({
  limites, onSalvar, onCancelar
}: {
  limites: (typeof PLANOS)[keyof typeof PLANOS]
  onSalvar: (dados: Partial<AlertaConfig>) => Promise<void>
  onCancelar: () => void
}) {
  const [dados, setDados] = useState<Partial<AlertaConfig>>({
    nome: '', palavrasChave: [], modalidades: [], portais: [],
    ufs: [], canal: ['EMAIL'], frequencia: 'IMEDIATO', ativo: true,
  })
  const [kwInput, setKwInput] = useState('')
  const [loading, setLoading] = useState(false)

  const addKw = () => {
    const kw = kwInput.trim()
    if (!kw || dados.palavrasChave!.includes(kw)) return
    setDados((p) => ({ ...p, palavrasChave: [...p.palavrasChave!, kw] }))
    setKwInput('')
  }

  async function handleSubmit() {
    if (!dados.nome || !dados.palavrasChave!.length || !dados.canal!.length) {
      toast.error('Preencha nome, palavras-chave e pelo menos um canal.')
      return
    }
    setLoading(true)
    try { await onSalvar(dados) }
    finally { setLoading(false) }
  }

  return (
    <div className="card p-6 animate-fade-up border-brand-200">
      <h2 className="font-display text-[15px] font-600 text-text mb-5">Novo alerta</h2>
      <div className="space-y-4">

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Nome do alerta</label>
          <input className="input" placeholder="Ex: Material de escritório SP"
            value={dados.nome} onChange={(e) => setDados((p) => ({ ...p, nome: e.target.value }))} />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
            Palavras-chave ({dados.palavrasChave!.length}/{limites.palavrasChave === -1 ? '∞' : limites.palavrasChave})
          </label>
          <div className="flex gap-2 mb-2">
            <input className="input flex-1" placeholder="Digite e pressione Enter"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKw())} />
            <button onClick={addKw} className="btn-ghost">Adicionar</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dados.palavrasChave!.map((kw) => (
              <span key={kw}
                className="inline-flex items-center gap-1 rounded-full bg-brand-100 text-brand-700 px-2.5 py-0.5 text-xs font-medium">
                {kw}
                <button onClick={() => setDados((p) => ({ ...p, palavrasChave: p.palavrasChave!.filter((k) => k !== kw) }))}
                  className="ml-1 hover:text-brand-900">×</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Canais de notificação</label>
          <div className="flex gap-2">
            {CANAIS.map(({ value, label, icon: Icon }) => (
              <button key={value}
                onClick={() => setDados((p) => ({
                  ...p,
                  canal: p.canal!.includes(value)
                    ? p.canal!.filter((c) => c !== value)
                    : [...p.canal!, value]
                }))}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm border transition-all',
                  dados.canal!.includes(value)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-muted border-surface-border hover:border-brand-400'
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">Frequência</label>
          <select className="input w-48"
            value={dados.frequencia}
            onChange={(e) => setDados((p) => ({ ...p, frequencia: e.target.value as any }))}>
            <option value="IMEDIATO">Imediato (tempo real)</option>
            <option value="DIARIO">Resumo diário</option>
            <option value="SEMANAL">Resumo semanal</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Salvando…' : 'Criar alerta'}
          </button>
          <button onClick={onCancelar} className="btn-ghost">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
