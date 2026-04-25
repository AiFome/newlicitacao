'use client'
// apps/web/src/components/layout/EmailVerificacaoBanner.tsx
import { useState } from 'react'
import { AlertTriangle, X, Send, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { usuarioApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export function EmailVerificacaoBanner() {
  const { usuario } = useAuthStore()
  const [dispensado, setDispensado] = useState(false)
  const [enviando,   setEnviando]   = useState(false)
  const [reenviado,  setReenviado]  = useState(false)

  // Não mostra se: e-mail já verificado, sem usuário, ou dispensado pelo usuário
  if (!usuario || usuario.emailVerificado || dispensado) return null

  async function reenviar() {
    setEnviando(true)
    try {
      // Chama o endpoint de reenvio via fetch direto (evita depender do api.ts que usa token)
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/v1/auth/reenviar-verificacao`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${localStorage.getItem('licitabr:token') ?? ''}`,
          },
        }
      )
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error ?? 'Erro ao reenviar.')
      setReenviado(true)
      toast.success('E-mail de verificação reenviado!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao reenviar.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={clsx(
      'flex items-center gap-3 px-5 py-3 text-sm border-b',
      'bg-amber-50 border-amber-200 text-amber-800'
    )}>
      <AlertTriangle size={16} className="shrink-0 text-amber-600" />

      <p className="flex-1 text-xs leading-snug">
        <span className="font-medium">Confirme seu e-mail</span>
        {' — '}verificamos que <strong>{usuario.email}</strong> ainda não foi confirmado.
        Algumas funcionalidades podem ser limitadas.
      </p>

      {/* Rate limit visual — 5 minutos antes de poder reenviar */}
      {reenviado ? (
        <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium shrink-0">
          <CheckCircle2 size={13} />
          Enviado!
        </span>
      ) : (
        <button
          onClick={reenviar}
          disabled={enviando}
          className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0 disabled:opacity-60"
        >
          {enviando ? (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : <Send size={12} />}
          {enviando ? 'Enviando…' : 'Reenviar e-mail'}
        </button>
      )}

      <button
        onClick={() => setDispensado(true)}
        className="text-amber-500 hover:text-amber-700 shrink-0"
        title="Dispensar"
      >
        <X size={15} />
      </button>
    </div>
  )
}
