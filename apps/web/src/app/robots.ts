// apps/web/src/app/robots.ts
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://licitabr.com.br'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:  ['/', '/landing', '/busca', '/licitacoes/', '/planos'],
        disallow: [
          '/dashboard',
          '/alertas',
          '/favoritos',
          '/configuracoes',
          '/api/',
          '/internal/',
          '/_next/',
        ],
      },
      {
        // Bloqueia scrapers agressivos
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot'],
        disallow:  ['/'],
      },
    ],
    sitemap:  `${BASE}/sitemap.xml`,
    host:     BASE,
  }
}
