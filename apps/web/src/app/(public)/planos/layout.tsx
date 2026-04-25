// apps/web/src/app/(public)/planos/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Planos e preços — LicitaBR',
  description: 'Free, Básico, Profissional e Enterprise. Trial 14 dias.',
  openGraph: {
    title:       'Planos a partir de R$ 0 — LicitaBR',
    description: 'Monitoramento de licitações. Cancele quando quiser.',
    type:        'website',
    locale:      'pt_BR',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
