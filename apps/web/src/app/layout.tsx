// apps/web/src/app/layout.tsx
import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: { template: '%s — LicitaBR', default: 'LicitaBR — Monitoramento de Licitações Públicas' },
  description: 'Monitore licitações públicas do PNCP, Comprasnet, BLL, BNC e mais 10 portais. Alertas em tempo real.',
  metadataBase: new URL('https://newlicitacao.com'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '12px',
              background: '#fff',
              color: '#18180f',
              border: '1px solid #e8e5dd',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#166b45', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
        {children}
      </body>
    </html>
  )
}
