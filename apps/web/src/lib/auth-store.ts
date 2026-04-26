// apps/web/src/lib/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from './api'

const COOKIE_NAME = 'licitabr:token'

function setCookie(value: string, horasExtras = 0) {
  if (typeof document === 'undefined') return
  // Cookie expira junto com o token JWT (2h) mais buffer
  const ms = (2 + horasExtras) * 3_600_000
  const expires = new Date(Date.now() + ms).toUTCString()
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function getTokenExpiry(token: string): number | null {
  try {
    const b64 = token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(b64))
    return exp ? exp * 1000 : null
  } catch {
    return null
  }
}

interface AuthState {
  usuario:         Usuario | null
  token:           string | null
  manterConectado: boolean
  isAuthenticated: boolean
  tokenExpiresAt:  number | null   // timestamp em ms

  setAuth:            (usuario: Usuario, token: string, manter?: boolean) => void
  clearAuth:          () => void
  setManterConectado: (v: boolean) => void
  renovarToken:       (novoToken: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario:         null,
      token:           null,
      manterConectado: false,
      tokenExpiresAt:  null,

      get isAuthenticated() {
        return !!get().token
      },

      setAuth(usuario, token, manter = false) {
        const expiresAt = getTokenExpiry(token)
        localStorage.setItem('licitabr:token', token)
        setCookie(token)
        if (manter) {
          // Cookie de 7 dias para "manter conectado"
          const expires = new Date(Date.now() + 7 * 864e5).toUTCString()
          document.cookie = `${COOKIE_NAME}=${token}; expires=${expires}; path=/; SameSite=Lax`
        }
        set({ usuario, token, manterConectado: manter, tokenExpiresAt: expiresAt })
      },

      clearAuth() {
        localStorage.removeItem('licitabr:token')
        deleteCookie()
        set({ usuario: null, token: null, tokenExpiresAt: null, manterConectado: false })
      },

      setManterConectado(v) {
        set({ manterConectado: v })
      },

      renovarToken(novoToken) {
        const expiresAt = getTokenExpiry(novoToken)
        localStorage.setItem('licitabr:token', novoToken)
        setCookie(novoToken)
        set({ token: novoToken, tokenExpiresAt: expiresAt })
      },
    }),
    {
      name:       'licitabr:usuario',
      partialize: (s) => ({ usuario: s.usuario, token: s.token, manterConectado: s.manterConectado, tokenExpiresAt: s.tokenExpiresAt }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) setCookie(state.token)
      },
    }
  )
)
