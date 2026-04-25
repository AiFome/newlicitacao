// apps/web/src/app/(public)/cadastro/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Criar conta — LicitaBR',
  description: 'Crie sua conta gratuita. Trial de 14 dias.',
  openGraph: {
    title:       'Criar conta grátis — LicitaBR',
    description: '14 dias de trial. Sem cartão.',
    type:        'website',
    locale:      'pt_BR',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
