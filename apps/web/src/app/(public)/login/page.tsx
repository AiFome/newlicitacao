'use client'
// apps/web/src/app/(public)/login/page.tsx
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, ArrowRight, FileText, AlertCircle, LogIn } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { usuarioApi } from '@/lib/api'

function LoginContent() {
  const router       = useRouter()
  const params       = useSearchParams()
  const { setAuth }  = useAuthStore()
  const expired      = params.get('expired') === '1'

  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState('')
  const [manterConectado, setManterConectado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const { usuario, token } = await usuarioApi.login(email, senha)
      setAuth(usuario, token, manterConectado)
      const redirect = params.get('redirect') ?? '/dashboard'
      router.push(redirect)
    } catch (err: any) {
      setErro(err.message ?? 'E-mail ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* Painel esquerdo — decorativo */}
      <div className="hidden lg:flex flex-col w-1/2 relative overflow-hidden"
        style={{ background: 'var(--brand-900)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, var(--brand-500) 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, var(--brand-300) 0%, transparent 70%)' }} />
        </div>
        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--brand-500)' }}>
              <FileText size={15} className="text-white" />
            </div>
            <span className="font-700 text-white">LicitaBR</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl font-300 text-white leading-tight mb-6"
              style={{ fontFamily: 'var(--font-display)' }}>
              Todos os editais<br />
              <span className="italic" style={{ color: 'var(--brand-300)' }}>do Brasil</span><br />
              em um lugar só.
            </h2>
            <div className="space-y-3">
              {['14 portais monitorados', 'Alertas em tempo real', 'Exportação Excel/CSV'].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--brand-400)' }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} LicitaBR
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'var(--brand-600)' }}>
              <FileText size={13} className="text-white" />
            </div>
            <span className="font-700 text-sm" style={{ color: 'var(--text)' }}>LicitaBR</span>
          </div>

          <h1 className="text-2xl font-600 mb-1 animate-fade-up" style={{ color: 'var(--text-strong)' }}>
            Bem-vindo de volta
          </h1>
          <p className="text-sm mb-8 animate-fade-up" style={{ color: 'var(--muted)', animationDelay: '0.05s' }}>
            Não tem conta?{' '}
            <Link href="/cadastro" className="font-500 transition-colors"
              style={{ color: 'var(--brand-600)' }}>
              Crie grátis agora
            </Link>
          </p>

          {/* Alerta de sessão expirada */}
          {expired && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm mb-6 animate-scale-in"
              style={{ background: '#fff8e1', border: '1px solid #f0d090', color: '#7a5500' }}>
              <AlertCircle size={15} />
              Sua sessão expirou. Faça login novamente.
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm mb-6 animate-scale-in"
              style={{ background: '#fff1f1', border: '1px solid #fecaca', color: '#b91c1c' }}>
              <AlertCircle size={15} />
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <div>
              <label className="block text-xs font-600 mb-1.5" style={{ color: 'var(--muted)' }}>E-MAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                required
                className="input"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-600" style={{ color: 'var(--muted)' }}>SENHA</label>
                <Link href="/esqueci-senha" className="text-xs font-500 transition-colors"
                  style={{ color: 'var(--brand-600)' }}>
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pr-10"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--muted)' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>


            {/* Manter conectado */}
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="manter"
                checked={manterConectado}
                onChange={(e) => setManterConectado(e.target.checked)}
                className="h-4 w-4 rounded border-surface-border accent-brand-600 cursor-pointer"
              />
              <label htmlFor="manter" className="text-sm cursor-pointer select-none" style={{ color: 'var(--muted)' }}>
                Manter conectado por 7 dias
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-600 text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-60 mt-2"
              style={{ background: 'var(--brand-600)', boxShadow: loading ? 'none' : '0 2px 8px rgba(22,107,69,0.2)' }}>
              {loading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={15} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-xs text-center" style={{ color: 'var(--muted-light)' }}>
            Ao entrar, você concorda com os{' '}
            <Link href="/termos"      style={{ color: 'var(--muted)' }}>Termos</Link>
            {' '}e a{' '}
            <Link href="/privacidade" style={{ color: 'var(--muted)' }}>Política de Privacidade</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
