// apps/web/src/app/(public)/login/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Entrar — LicitaBR',
  description: 'Acesse sua conta LicitaBR.',
  robots: { index: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
