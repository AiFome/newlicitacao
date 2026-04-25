// apps/web/src/lib/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario } from './api'

// ── Helpers de cookie (client-side) ────────────────────
const COOKIE_NAME = 'licitabr:token'
const COOKIE_DAYS = 7

function setCookie(value: string) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString()
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function deleteCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

// ── Store ───────────────────────────────────────────────
interface AuthState {
  usuario: Usuario | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (usuario: Usuario, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      token:   null,

      get isAuthenticated() {
        return !!get().token
      },

      setAuth(usuario, token) {
        localStorage.setItem('licitabr:token', token)
        setCookie(token)
        set({ usuario, token })
      },

      clearAuth() {
        localStorage.removeItem('licitabr:token')
        deleteCookie()
        set({ usuario: null, token: null })
      },
    }),
    {
      name:       'licitabr:usuario',
      partialize: (s) => ({ usuario: s.usuario, token: s.token }),
      // Após reidratar, sincroniza o cookie caso o browser tenha perdido
      onRehydrateStorage: () => (state) => {
        if (state?.token) setCookie(state.token)
      },
    }
  )
)
