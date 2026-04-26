'use client'
// Componente que mostra o tempo restante de sessão e permite renovar
import { useState, useEffect, useCallback } from 'react'
import { Clock, RefreshCw, X } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export function SessionTimer() {
  const { token, tokenExpiresAt, renovarToken, clearAuth } = useAuthStore()
  const [restante, setRestante] = useState<number | null>(null)
  const [renovando, setRenovando] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!tokenExpiresAt) return

    const interval = setInterval(() => {
      const diff = tokenExpiresAt - Date.now()
      setRestante(diff > 0 ? diff : 0)
    }, 1000)

    return () => clearInterval(interval)
  }, [tokenExpiresAt])

  const renovar = useCallback(async () => {
    if (!token) return
    setRenovando(true)
    try {
      const { token: novoToken } = await authApi.renovar()
      renovarToken(novoToken)
      setDismissed(false)
      toast.success('Sessão renovada por mais 2 horas!')
    } catch {
      toast.error('Não foi possível renovar a sessão.')
    } finally {
      setRenovando(false)
    }
  }, [token, renovarToken])

  if (!restante || restante <= 0 || dismissed) return null

  const minutos = Math.floor(restante / 60_000)
  const segundos = Math.floor((restante % 60_000) / 1_000)

  // Mostrar apenas nos últimos 15 minutos
  if (minutos > 15) return null

  const urgente = minutos < 5

  return (
    <div className={clsx(
      'fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl border transition-all animate-scale-in',
      urgente
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    )}>
      <Clock size={16} className={urgente ? 'text-red-500' : 'text-amber-500'} />
      <div>
        <p className="text-xs font-700">Sessão expira em</p>
        <p className="text-lg font-700 tabular-nums leading-none">
          {String(minutos).padStart(2, '0')}:{String(segundos).padStart(2, '0')}
        </p>
      </div>
      <button
        onClick={renovar}
        disabled={renovando}
        className={clsx(
          'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-600 transition-all',
          urgente ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-amber-500 text-white hover:bg-amber-600'
        )}>
        <RefreshCw size={12} className={renovando ? 'animate-spin' : ''} />
        {renovando ? 'Renovando...' : 'Renovar +2h'}
      </button>
      <button onClick={() => setDismissed(true)} className="text-current opacity-40 hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  )
}
