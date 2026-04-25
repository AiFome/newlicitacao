// apps/web/src/app/sitemap.ts
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://licitabr.com.br'

// Rotas estáticas
const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE}/landing`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
  { url: `${BASE}/planos`,           lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
  { url: `${BASE}/login`,            lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.5 },
  { url: `${BASE}/cadastro`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.7 },
  { url: `${BASE}/busca`,            lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Busca licitações abertas para indexar no sitemap
  // (em produção fazer fetch direto na API interna)
  let licitacoesRoutes: MetadataRoute.Sitemap = []

  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const resp = await fetch(
      `${apiBase}/v1/licitacoes?situacao=ABERTA&limit=1000&sort=recentes`,
      { next: { revalidate: 3600 } } // revalida a cada hora
    )

    if (resp.ok) {
      const data = await resp.json() as { data: { id: string; updatedAt: string }[] }
      licitacoesRoutes = data.data.map((lic) => ({
        url:          `${BASE}/licitacoes/${lic.id}`,
        lastModified: new Date(lic.updatedAt),
        changeFrequency: 'daily' as const,
        priority:     0.7,
      }))
    }
  } catch {
    // Silencioso — sitemap estático se a API estiver fora
  }

  return [...STATIC_ROUTES, ...licitacoesRoutes]
}
