// apps/web/src/app/(public)/verificar-email/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Verificar e-mail — LicitaBR',
  description: 'Confirme seu e-mail para ativar sua conta.',
  robots: { index: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
