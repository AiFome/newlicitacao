'use client'
// apps/web/src/app/(app)/configuracoes/page.tsx
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  User, Lock, Bell, CreditCard,
  Check, AlertCircle, Eye, EyeOff,
  MessageSquare, Mail, Smartphone, Copy,
  Monitor, Trash2,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { usuarioApi, authApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Aba = 'perfil' | 'senha' | 'notificacoes' | 'plano'

// ── Dados dos planos ────────────────────────────────────
const PLANOS_INFO = {
  FREE:         { label: 'Gratuito',    preco: 'R$ 0',        cor: 'bg-gray-100 text-gray-700' },
  BASICO:       { label: 'Básico',      preco: 'R$ 49/mês',   cor: 'bg-blue-50 text-blue-700' },
  PROFISSIONAL: { label: 'Profissional', preco: 'R$ 149/mês', cor: 'bg-brand-100 text-brand-700' },
  ENTERPRISE:   { label: 'Enterprise',  preco: 'Sob consulta', cor: 'bg-amber-50 text-amber-700' },
}

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>('perfil')

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-7 animate-fade-up">
        <h1 className="font-display text-2xl font-700 text-text tracking-tight">Configurações</h1>
        <p className="text-sm text-muted mt-1">Gerencie sua conta, senha e preferências.</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-surface-muted rounded-xl p-1 mb-7 animate-fade-up w-fit" style={{ animationDelay: '0.04s' }}>
        {([ 
          { id: 'perfil',       label: 'Perfil',        icon: User },
          { id: 'senha',        label: 'Senha',         icon: Lock },
          { id: 'notificacoes', label: 'Notificações',  icon: Bell },
          { id: 'plano',        label: 'Meu plano',     icon: CreditCard },
        ] as { id: Aba; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              aba === id
                ? 'bg-white text-text shadow-card border border-surface-border'
                : 'text-muted hover:text-text'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
      <div className="animate-fade-up" style={{ animationDelay: '0.08s' }}>
        {aba === 'perfil'       && <AbaPerfil />}
        {aba === 'senha'        && <AbaSenha />}
        {aba === 'notificacoes' && <AbaNotificacoes />}
        {aba === 'plano'        && <AbaPlano />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ABA PERFIL
// ─────────────────────────────────────────────────────────
function AbaPerfil() {
  const { usuario, setAuth, token } = useAuthStore()
  const [nome,     setNome]     = useState(usuario?.nome     ?? '')
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '')
  const [loading,  setLoading]  = useState(false)
  const [salvo,    setSalvo]    = useState(false)

  async function salvar() {
    setLoading(true)
    try {
      const atualizado = await usuarioApi.atualizar({ nome: nome.trim(), telefone: telefone.trim() || undefined })
      setAuth(atualizado, token!)
      setSalvo(true)
      toast.success('Perfil atualizado!')
      setTimeout(() => setSalvo(false), 3000)
    } catch (e) {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-display text-[15px] font-600 text-text mb-5">Informações pessoais</h2>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-border">
          <div className="h-16 w-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-semibold shrink-0">
            {nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-text">{nome || 'Seu nome'}</p>
            <p className="text-xs text-muted mt-0.5">{usuario?.email}</p>
            <p className="text-xs text-muted mt-1">
              Membro desde {usuario?.createdAt
                ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(usuario.createdAt))
                : '—'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Nome completo">
            <input
              className="input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
            />
          </Field>

          <Field label="E-mail" hint="Para alterar o e-mail entre em contato com o suporte.">
            <input
              className="input opacity-60 cursor-not-allowed"
              value={usuario?.email ?? ''}
              disabled
            />
          </Field>

          <Field label="Telefone (opcional)">
            <input
              className="input"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-0000"
              type="tel"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={salvar}
            disabled={loading}
            className={clsx(
              'btn gap-2 transition-all',
              salvo ? 'bg-emerald-600 text-white border-emerald-600' : 'btn-primary'
            )}
          >
            {loading ? <Spinner /> : salvo ? <Check size={15} /> : null}
            {loading ? 'Salvando…' : salvo ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Zona de perigo */}
      <div className="card p-6 border-red-200">
        <h2 className="font-display text-[15px] font-600 text-text mb-1">Zona de perigo</h2>
        <p className="text-sm text-muted mb-4">Estas ações são irreversíveis. Proceda com cautela.</p>
        <button
          onClick={() => toast.error('Entre em contato com o suporte para excluir sua conta.')}
          className="btn-danger text-sm"
        >
          Excluir minha conta
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ABA SENHA
// ─────────────────────────────────────────────────────────
function AbaSenha() {
  const [atual,    setAtual]    = useState('')
  const [nova,     setNova]     = useState('')
  const [confirma, setConfirma] = useState('')
  const [showAtual, setShowAtual] = useState(false)
  const [showNova,  setShowNova]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState<string | null>(null)

  // Força da senha
  const regras = [
    { label: '8+ caracteres',     ok: nova.length >= 8 },
    { label: 'Maiúscula',         ok: /[A-Z]/.test(nova) },
    { label: 'Minúscula',         ok: /[a-z]/.test(nova) },
    { label: 'Número ou símbolo', ok: /[\d\W]/.test(nova) },
  ]
  const forca = regras.filter((r) => r.ok).length
  const forcaCor = ['', 'bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][forca]

  async function salvar() {
    setErro(null)
    if (!atual) return setErro('Informe a senha atual.')
    if (forca < 3) return setErro('Escolha uma senha mais forte.')
    if (nova !== confirma) return setErro('As senhas não coincidem.')
    setLoading(true)
    try {
      await usuarioApi.alterarSenha(atual, nova)
      toast.success('Senha alterada com sucesso!')
      setAtual(''); setNova(''); setConfirma('')
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao alterar senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
    <div className="card p-6 space-y-5">
      <h2 className="font-display text-[15px] font-600 text-text">Alterar senha</h2>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0" /> {erro}
        </div>
      )}

      <Field label="Senha atual">
        <PasswordInput
          value={atual} onChange={setAtual}
          show={showAtual} onToggle={() => setShowAtual((p) => !p)}
          placeholder="Sua senha atual"
        />
      </Field>

      <Field label="Nova senha">
        <PasswordInput
          value={nova} onChange={setNova}
          show={showNova} onToggle={() => setShowNova((p) => !p)}
          placeholder="Mínimo 8 caracteres"
        />
        {nova.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1 mb-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={clsx('h-1 flex-1 rounded-full transition-all', i < forca ? forcaCor : 'bg-surface-muted')} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {regras.map((r) => (
                <span key={r.label} className={clsx('text-[11px] flex items-center gap-1', r.ok ? 'text-emerald-600' : 'text-muted')}>
                  <Check size={10} className={r.ok ? 'opacity-100' : 'opacity-0'} />
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </Field>

      <Field label="Confirmar nova senha">
        <div className="relative">
          <input
            type="password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            placeholder="Repita a nova senha"
            className={clsx(
              'input pr-8',
              confirma && confirma === nova && 'border-emerald-400'
            )}
          />
          {confirma && confirma === nova && (
            <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
          )}
        </div>
      </Field>

      <button onClick={salvar} disabled={loading} className="btn-primary gap-2">
        {loading && <Spinner />}
        {loading ? 'Alterando…' : 'Alterar senha'}
      </button>
    </div>

    {/* Sessões ativas */}
    <AbasSessoes />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ABA NOTIFICAÇÕES
// ─────────────────────────────────────────────────────────
function AbaNotificacoes() {
  const { usuario, setAuth, token } = useAuthStore()
  const [prefs, setPrefs] = useState({
    notifEmail:    usuario?.notifEmail    ?? true,
    notifTelegram: usuario?.notifTelegram ?? false,
    notifPush:     usuario?.notifPush     ?? false,
  })
  const [telegramId, setTelegramId] = useState(usuario?.telegramChatId ?? '')
  const [loading, setLoading] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const BOT_LINK = 'https://t.me/LicitaBRBot'

  async function salvar() {
    setLoading(true)
    try {
      const atualizado = await usuarioApi.atualizar({
        ...prefs,
        telegramChatId: telegramId.trim() || undefined,
      })
      setAuth(atualizado, token!)
      toast.success('Preferências salvas!')
    } catch {
      toast.error('Erro ao salvar preferências.')
    } finally {
      setLoading(false)
    }
  }

  function copiarChatId() {
    navigator.clipboard.writeText(telegramId)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="space-y-4">

      {/* Canais */}
      <div className="card p-6">
        <h2 className="font-display text-[15px] font-600 text-text mb-4">Canais de notificação</h2>
        <div className="space-y-4">

          <Toggle
            icon={<Mail size={16} />}
            label="E-mail"
            desc="Receba alertas e resumos diários por e-mail."
            checked={prefs.notifEmail}
            onChange={(v) => setPrefs((p) => ({ ...p, notifEmail: v }))}
          />

          <div className="border-t border-surface-border pt-4">
            <Toggle
              icon={<MessageSquare size={16} />}
              label="Telegram"
              desc="Alertas instantâneos direto no seu Telegram."
              checked={prefs.notifTelegram}
              onChange={(v) => setPrefs((p) => ({ ...p, notifTelegram: v }))}
            />

            {prefs.notifTelegram && (
              <div className="mt-4 ml-8 p-4 rounded-xl bg-surface-muted border border-surface-border space-y-3">
                <p className="text-xs text-muted leading-relaxed">
                  1. Acesse o bot{' '}
                  <a href={BOT_LINK} target="_blank" rel="noopener noreferrer"
                    className="text-brand-600 hover:underline font-medium">
                    @LicitaBRBot
                  </a>{' '}
                  no Telegram e envie <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-surface-border">/start</code>.
                </p>
                <p className="text-xs text-muted">
                  2. O bot vai responder com seu Chat ID. Cole abaixo:
                </p>
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1"
                    placeholder="Ex: 123456789"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                  />
                  {telegramId && (
                    <button onClick={copiarChatId} className="btn-ghost p-2.5" title="Copiar">
                      {copiado ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-surface-border pt-4">
            <Toggle
              icon={<Smartphone size={16} />}
              label="Push (navegador)"
              desc="Notificações no browser, mesmo com o site fechado."
              checked={prefs.notifPush}
              onChange={(v) => setPrefs((p) => ({ ...p, notifPush: v }))}
            />
          </div>
        </div>
      </div>

      <button onClick={salvar} disabled={loading} className="btn-primary gap-2">
        {loading && <Spinner />}
        {loading ? 'Salvando…' : 'Salvar preferências'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// ABA PLANO
// ─────────────────────────────────────────────────────────
function AbaPlano() {
  const { usuario } = useAuthStore()
  const plano    = (usuario?.plano ?? 'FREE') as keyof typeof PLANOS_INFO
  const planoInfo = PLANOS_INFO[plano]

  return (
    <div className="space-y-4">
      {/* Plano atual */}
      <div className="card p-6">
        <h2 className="font-display text-[15px] font-600 text-text mb-4">Plano atual</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={clsx('badge text-sm px-3 py-1 rounded-lg font-semibold', planoInfo.cor)}>
              {planoInfo.label}
            </span>
            <span className="text-sm text-muted">{planoInfo.preco}</span>
          </div>
          {plano !== 'ENTERPRISE' && (
            <a href="/planos" className="btn-primary text-sm">
              Fazer upgrade
            </a>
          )}
        </div>

        {usuario?.trialAte && new Date(usuario.trialAte) > new Date() && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-sm text-amber-700">
            <AlertCircle size={14} className="shrink-0" />
            Trial gratuito ativo até{' '}
            {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
              .format(new Date(usuario.trialAte))}
          </div>
        )}
      </div>

      {/* Limites do plano */}
      <div className="card p-6">
        <h2 className="font-display text-[15px] font-600 text-text mb-4">Limites do plano</h2>
        <div className="space-y-3">
          {[
            { label: 'Alertas ativos',      valor: plano === 'FREE' ? '1' : plano === 'BASICO' ? '5' : plano === 'PROFISSIONAL' ? '30' : 'Ilimitado' },
            { label: 'Palavras-chave',       valor: plano === 'FREE' ? '3' : plano === 'BASICO' ? '10' : plano === 'PROFISSIONAL' ? '50' : 'Ilimitado' },
            { label: 'Portais monitorados',  valor: plano === 'FREE' ? 'PNCP' : plano === 'BASICO' ? '3 portais' : 'Todos' },
            { label: 'Download de editais',  valor: plano === 'FREE' ? '5/mês' : plano === 'BASICO' ? '50/mês' : 'Ilimitado' },
            { label: 'Exportação CSV/Excel', valor: ['PROFISSIONAL','ENTERPRISE'].includes(plano) ? 'Disponível' : 'Não disponível' },
          ].map(({ label, valor }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
              <span className="text-sm text-muted">{label}</span>
              <span className="text-sm font-medium text-text">{valor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gerenciar assinatura */}
      {plano !== 'FREE' && (
        <div className="card p-6">
          <h2 className="font-display text-[15px] font-600 text-text mb-1">Assinatura</h2>
          <p className="text-sm text-muted mb-4">Gerencie sua forma de pagamento, histórico de faturas e cancelamento.</p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={async () => {
                try {
                  const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/stripe/portal`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('licitabr:token') ?? ''}` },
                  })
                  const data = await resp.json()
                  if (!resp.ok) throw new Error(data?.error ?? 'Erro')
                  window.location.href = data.url
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : 'Erro ao acessar portal.')
                }
              }}
              className="btn-ghost gap-2"
            >
              <CreditCard size={15} />
              Gerenciar assinatura
            </button>
            <a href="/planos" className="btn-ghost gap-2 text-sm">
              Ver todos os planos
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// SESSÕES ATIVAS
// ─────────────────────────────────────────────────────────
function AbasSessoes() {
  const { data: sessoes, mutate } = useSWR('sessoes', usuarioApi.sessoes, { revalidateOnFocus: false })
  const [revogando, setRevogando] = useState<string | null>(null)

  async function revogarTodas() {
    try {
      await usuarioApi.revogarTodasSessoes()
      await mutate()
      toast.success('Todas as outras sessões foram encerradas.')
    } catch {
      toast.error('Erro ao encerrar sessões.')
    }
  }

  async function revogar(id: string) {
    setRevogando(id)
    try {
      await usuarioApi.revogarSessao(id)
      mutate((prev) => prev?.filter((s) => s.id !== id), false)
      toast.success('Sessão encerrada.')
    } catch {
      toast.error('Erro ao encerrar sessão.')
    } finally {
      setRevogando(null)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-[15px] font-600 text-text">Sessões ativas</h2>
        {(sessoes?.length ?? 0) > 1 && (
          <button onClick={revogarTodas} className="text-xs text-red-600 hover:underline">
            Encerrar todas
          </button>
        )}
      </div>
      <div className="space-y-2">
        {!sessoes?.length && (
          <p className="text-sm text-muted">Nenhuma sessão ativa encontrada.</p>
        )}
        {sessoes?.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-border">
            <Monitor size={16} className="text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text truncate">{s.userAgent ?? 'Navegador desconhecido'}</p>
              <p className="text-[11px] text-muted mt-0.5">
                {s.ip ?? 'IP desconhecido'} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(s.createdAt))}
              </p>
            </div>
            {i === 0 && (
              <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                Atual
              </span>
            )}
            {i > 0 && (
              <button
                onClick={() => revogar(s.id)}
                disabled={revogando === s.id}
                className="text-muted hover:text-red-500 transition-colors shrink-0"
                title="Encerrar sessão"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted mt-1">{hint}</p>}
    </div>
  )
}

function PasswordInput({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void; placeholder: string
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pr-10"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function Toggle({ icon, label, desc, checked, onChange }: {
  icon: React.ReactNode; label: string; desc: string
  checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted group-hover:text-text transition-colors">{icon}</div>
        <div>
          <p className="text-sm font-medium text-text">{label}</p>
          <p className="text-xs text-muted">{desc}</p>
        </div>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-5 w-9 rounded-full transition-colors shrink-0',
          checked ? 'bg-brand-600' : 'bg-surface-border'
        )}
      >
        <span className={clsx(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm',
          checked ? 'translate-x-4' : 'translate-x-0'
        )} />
      </div>
    </label>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
