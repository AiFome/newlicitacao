// apps/web/src/app/(app)/licitacoes/[id]/page.tsx
// Server Component — exporta generateMetadata + renderiza o Client Component
import type { Metadata } from 'next'
import { LicitacaoDetalheClient } from './LicitacaoDetalheClient'
import { MODALIDADE_LABEL, PORTAL_LABEL, formatMoedaCompacta } from '@/lib/format'

const API  = process.env.NEXT_PUBLIC_API_URL  ?? 'http://localhost:3001'
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://licitabr.com.br'

// Next.js lê generateMetadata automaticamente quando exportado do page.tsx
export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  try {
    const resp = await fetch(`${API}/v1/licitacoes/${params.id}`, {
      next: { revalidate: 300 },
    })
    if (!resp.ok) return { title: 'Edital — LicitaBR' }

    const lic = await resp.json() as {
      titulo: string; objeto: string; modalidade: string
      uf: string; portalOrigem: string; valorEstimado: number | null
      orgao: { razaoSocial: string }
    }

    const titulo = `${lic.titulo.substring(0, 60)} — LicitaBR`
    const desc   = [
      MODALIDADE_LABEL[lic.modalidade] ?? lic.modalidade,
      lic.orgao.razaoSocial,
      lic.valorEstimado ? formatMoedaCompacta(lic.valorEstimado) : null,
      lic.uf,
      PORTAL_LABEL[lic.portalOrigem] ?? lic.portalOrigem,
    ].filter(Boolean).join(' · ')

    return {
      title:       titulo,
      description: desc,
      openGraph:   { title: titulo, description: desc, url: `${BASE}/licitacoes/${params.id}`, type: 'article', locale: 'pt_BR' },
      twitter:     { card: 'summary', title: titulo, description: desc },
    }
  } catch {
    return { title: 'Edital — LicitaBR' }
  }
}

export default function LicitacaoDetalhePage({ params }: { params: { id: string } }) {
  return <LicitacaoDetalheClient id={params.id} />
}
