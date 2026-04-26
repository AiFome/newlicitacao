'use client'
// apps/web/src/app/(app)/perfil/page.tsx
import { useState, useRef } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { usuarioApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { User, Lock, Camera, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function PerfilPage() {
  const { usuario, setAuth, token } = useAuthStore()
  const [aba, setAba] = useState<'dados' | 'senha' | 'foto'>('dados')

  const [nome,     setNome]     = useState(usuario?.nome ?? '')
  const [telefone, setTelefone] = useState(usuario?.telefone ?? '')
  const [salvando, setSalvando] = useState(false)

  const [senhaAtual,     setSenhaAtual]     = useState('')
  const [novaSenha,      setNovaSenha]      = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showAtual,      setShowAtual]      = useState(false)
  const [showNova,       setShowNova]       = useState(false)
  const [salvandoSenha,  setSalvandoSenha]  = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(usuario?.avatarUrl ?? null)

  async function salvarDados(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    try {
      const updated = await usuarioApi.atualizar({ nome, telefone })
      if (usuario && token) setAuth({ ...usuario, ...updated }, token)
      toast.success('Dados atualizados!')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar')
    } finally { setSalvando(false) }
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha !== confirmarSenha) { toast.error('As senhas não coincidem'); return }
    if (novaSenha.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setSalvandoSenha(true)
    try {
      await usuarioApi.alterarSenha({ senhaAtual, novaSenha })
      toast.success('Senha alterada!')
      setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao alterar senha')
    } finally { setSalvandoSenha(false) }
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2MB'); return }
    setPreview(URL.createObjectURL(file))
    toast.success('Foto atualizada!')
  }

  const ABAS = [
    { id: 'dados' as const, label: 'Dados pessoais', icon: User },
    { id: 'senha' as const, label: 'Alterar senha',  icon: Lock },
    { id: 'foto'  as const, label: 'Foto de perfil', icon: Camera },
  ]

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-700 text-text tracking-tight mb-1">Meu Perfil</h1>
        <p className="text-sm text-muted">Gerencie seus dados pessoais e segurança</p>
      </div>

      <div className="flex gap-1 border-b border-surface-border mb-8">
        {ABAS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setAba(id)}
            className={clsx('flex items-center gap-2 px-4 py-2.5 text-sm font-500 border-b-2 -mb-px transition-colors', {
              'border-brand-600 text-brand-700': aba === id,
              'border-transparent text-muted hover:text-text': aba !== id,
            })}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {aba === 'dados' && (
        <form onSubmit={salvarDados} className="space-y-5 animate-fade-up">
          <div>
            <label className="block text-xs font-600 text-muted uppercase tracking-wide mb-1.5">Nome completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-xs font-600 text-muted uppercase tracking-wide mb-1.5">E-mail</label>
            <input value={usuario?.email ?? ''} className="input opacity-60" disabled />
            <p className="text-xs text-muted mt-1">O e-mail não pode ser alterado</p>
          </div>
          <div>
            <label className="block text-xs font-600 text-muted uppercase tracking-wide mb-1.5">Telefone (opcional)</label>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} className="input" placeholder="(11) 99999-9999" />
          </div>
          <button type="submit" disabled={salvando} className="btn-primary gap-2 px-6 py-2.5 disabled:opacity-60" style={{ background: 'var(--brand-600)' }}>
            {salvando ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Check size={14} />Salvar dados</>}
          </button>
        </form>
      )}

      {aba === 'senha' && (
        <form onSubmit={salvarSenha} className="space-y-5 animate-fade-up">
          {[
            { label: 'Senha atual', value: senhaAtual, set: setSenhaAtual, show: showAtual, setShow: setShowAtual },
            { label: 'Nova senha', value: novaSenha, set: setNovaSenha, show: showNova, setShow: setShowNova },
            { label: 'Confirmar nova senha', value: confirmarSenha, set: setConfirmarSenha, show: showNova, setShow: setShowNova },
          ].map(({ label, value, set, show, setShow }, i) => (
            <div key={i}>
              <label className="block text-xs font-600 text-muted uppercase tracking-wide mb-1.5">{label}</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={value} onChange={(e) => set(e.target.value)} className="input pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={salvandoSenha} className="btn-primary gap-2 px-6 py-2.5 disabled:opacity-60" style={{ background: 'var(--brand-600)' }}>
            {salvandoSenha ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : <><Check size={14} />Alterar senha</>}
          </button>
        </form>
      )}

      {aba === 'foto' && (
        <div className="animate-fade-up flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-surface-border bg-brand-50 flex items-center justify-center">
              {preview
                ? <img src={preview} alt="Foto" className="h-full w-full object-cover" />
                : <span className="text-4xl font-700 text-brand-600 uppercase">{usuario?.nome?.[0] ?? 'U'}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-md" style={{ background: 'var(--brand-600)' }}>
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="btn-secondary gap-2 px-6">
            <Camera size={14} />Alterar foto
          </button>
          <p className="text-xs text-muted">JPG, PNG ou GIF — máximo 2MB</p>
        </div>
      )}
    </div>
  )
}
