// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: { template: '%s — LicitaBR', default: 'LicitaBR — Monitoramento de Licitações Públicas' },
  description: 'Monitore editais de licitação de todos os portais públicos em um só lugar. Alertas em tempo real, filtros avançados e dashboard completo.',
  keywords: ['licitação', 'edital', 'pregão', 'PNCP', 'comprasnet', 'licitações públicas'],
  openGraph: {
    title: 'LicitaBR — Monitoramento de Licitações',
    description: 'Todos os editais públicos do Brasil em um só lugar.',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '14px',
              borderRadius: '10px',
              border: '1px solid #e3e1d8',
            },
            success: { iconTheme: { primary: '#1a4731', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}
