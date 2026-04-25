// apps/web/src/app/(public)/esqueci-senha/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title:       'Recuperar senha — LicitaBR',
  description: 'Redefina a senha da sua conta LicitaBR.',
  robots: { index: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
