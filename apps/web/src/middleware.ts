// apps/web/src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Rotas que exigem autenticação ───────────────────────
const ROTAS_PROTEGIDAS = [
  '/dashboard',
  '/busca',
  '/licitacoes',
  '/alertas',
  '/favoritos',
  '/configuracoes',
  '/planos/gerenciar',
  '/admin',
]

// ── Rotas que NÃO devem ser acessadas se já autenticado ─
const ROTAS_SO_PUBLICAS = [
  '/login',
  '/cadastro',
  '/esqueci-senha',
  '/redefinir-senha',
  '/verificar-email',
]

// ── Rotas totalmente públicas (sem lógica de auth) ──────
const ROTAS_IGNORADAS = [
  '/_next',
  '/favicon',
  '/robots',
  '/sitemap',
  '/api',
  '/landing',
  '/termos',
  '/privacidade',
]

function estaProtegida(pathname: string): boolean {
  return ROTAS_PROTEGIDAS.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

function eSoPublica(pathname: string): boolean {
  return ROTAS_SO_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + '/'))
}

function deveIgnorar(pathname: string): boolean {
  return ROTAS_IGNORADAS.some((r) => pathname.startsWith(r))
}

/**
 * Valida se o token JWT tem formato correto e não está expirado.
 * Não verifica a assinatura (isso é feito pela API) — apenas descarta
 * tokens malformados ou visivelmente expirados para evitar loops de redirect.
 */
function tokenPareceValido(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    // Decodifica o payload (segunda parte) sem verificar assinatura
    const payload = JSON.parse(
      Buffer.from(parts[1]!, 'base64url').toString('utf-8')
    ) as { exp?: number; sub?: string }

    // Verifica campos mínimos
    if (!payload.sub || !payload.exp) return false

    // Verifica expiração (com 30s de tolerância para clock skew)
    const agora = Math.floor(Date.now() / 1000)
    return payload.exp > agora - 30

  } catch {
    // Token malformado, corrompido ou com padding inválido
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora assets, _next e API
  if (deveIgnorar(pathname)) return NextResponse.next()

  // Lê o token do cookie (definido no login)
  const rawToken = request.cookies.get('licitabr:token')?.value

  // Valida o token de forma segura — token malformado é tratado como ausente
  const token = rawToken && tokenPareceValido(rawToken) ? rawToken : null

  // Se havia cookie mas o token é inválido/expirado, limpa o cookie
  if (rawToken && !token) {
    const response = NextResponse.redirect(
      new URL('/login?expired=1', request.url)
    )
    response.cookies.delete('licitabr:token')
    return response
  }

  // Rota raiz → autenticado vai ao dashboard, visitante vai à landing
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = token ? '/dashboard' : '/landing'
    return NextResponse.redirect(url)
  }

  // Rota protegida sem token → redireciona para login
  if (estaProtegida(pathname) && !token) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Rota só-pública com token → redireciona para dashboard
  if (eSoPublica(pathname) && token) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  // Passa o token no header para Server Components consumirem
  const response = NextResponse.next()
  if (token) {
    response.headers.set('x-licitabr-token', token)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
