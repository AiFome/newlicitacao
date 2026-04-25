// apps/web/src/app/page.tsx
// O middleware já cuida dos redirecionamentos baseados em cookie.
// Esta página é um fallback para o caso de o middleware não pegar (ex: build estático).
import { redirect } from 'next/navigation'

export default function RootPage() {
  // Em produção com middleware ativo, esta página nunca é renderizada.
  // Redireciona para a landing page pública.
  redirect('/login')
}
