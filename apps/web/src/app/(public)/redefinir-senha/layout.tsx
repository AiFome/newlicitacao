// apps/web/src/app/(public)/redefinir-senha/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Nova senha — LicitaBR',
  description: 'Defina uma nova senha para sua conta.',
  robots: { index: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
