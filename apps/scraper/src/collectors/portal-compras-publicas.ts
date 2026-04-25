// apps/scraper/src/collectors/portal-compras-publicas.ts
//
// Portal Compras Públicas (https://www.portaldecompraspublicas.com.br)
// Expõe endpoint REST semipúblico para consulta de licitações abertas.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface PCPItem {
  id:             string | number
  numero:         string
  objeto:         string
  modalidade:     string
  situacao?:      string
  valorEstimado?: number
  dataAbertura:   string
  dataPublicacao?: string
  uf:             string
  municipio?:     string
  linkEdital?:    string
  orgao: {
    id?:          string | number
    nome:         string
    cnpj?:        string
  }
}

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregao_eletronico':  Modalidade.PREGAO_ELETRONICO,
  'pregao_presencial':  Modalidade.PREGAO_PRESENCIAL,
  'pregao eletronico':  Modalidade.PREGAO_ELETRONICO,
  'concorrencia':       Modalidade.CONCORRENCIA,
  'concorrência':       Modalidade.CONCORRENCIA,
  'tomada_precos':      Modalidade.TOMADA_DE_PRECOS,
  'convite':            Modalidade.CONVITE,
  'leilao':             Modalidade.LEILAO,
  'leilão':             Modalidade.LEILAO,
  'dispensa':           Modalidade.DISPENSA,
  'inexigibilidade':    Modalidade.INEXIGIBILIDADE,
  'credenciamento':     Modalidade.CREDENCIAMENTO,
}

function normModalidade(v: string): Modalidade {
  const key = v.toLowerCase().trim().replace(/\s+/g, '_')
  return MODALIDADE_MAP[key] ?? MODALIDADE_MAP[v.toLowerCase().trim()] ?? Modalidade.PREGAO_ELETRONICO
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.portaldecompraspublicas.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.portaldecompraspublicas.com.br/',
    },
  })
}

async function upsertOrgaoPCP(orgao: PCPItem['orgao'], uf: string, municipio?: string) {
  const cnpj = orgao.cnpj ?? `PCP:${orgao.id ?? orgao.nome.substring(0, 40)}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: orgao.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'BR',
      municipio:   municipio?.trim() ?? null,
    },
    update: { razaoSocial: orgao.nome.trim() },
  })
}

export interface PCPStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarPortalComprasPublicas(opts: {
  paginas?: number
  uf?:      string
}): Promise<PCPStats> {
  const stats: PCPStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[PCP] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        status:   'aberto',
        pagina,
        limite:   50,
        ordem:    'dataAbertura',
        direcao:  'asc',
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/v1/licitacoes/abertas', { params })
      const data = resp.data as {
        dados:         PCPItem[]
        totalPaginas?: number
        total?:        number
      } | null

      if (!data?.dados?.length) {
        console.log(`[PCP] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.dados.length
      console.log(`[PCP] Página ${pagina}: ${data.dados.length} itens`)

      for (const item of data.dados) {
        try {
          const orgao         = await upsertOrgaoPCP(item.orgao, item.uf, item.municipio)
          const codigoExterno = `PCP:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.PORTAL_COMPRAS_PUBLICAS, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.PORTAL_COMPRAS_PUBLICAS, codigoExterno } },
            create: {
              numeroEdital:  item.numero || String(item.id),
              titulo:        item.objeto.substring(0, 255),
              objeto:        item.objeto,
              modalidade:    normModalidade(item.modalidade),
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valorEstimado ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.linkEdital ?? `https://www.portaldecompraspublicas.com.br/licitacoes/${item.id}`,
              portalOrigem:  Portal.PORTAL_COMPRAS_PUBLICAS,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'BR',
              municipio:     item.municipio?.trim() ?? null,
              orgaoId:       orgao.id,
            },
            update: { updatedAt: new Date() },
          })

          if (!existing) {
            indexarLicitacao(licitacao.id).catch(() => {})
            const apiBase = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
            fetch(`${apiBase}/internal/alertas/processar`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
              body:    JSON.stringify({ licitacaoId: licitacao.id }),
            }).catch(() => {})
            stats.novos++
          } else {
            stats.atualizados++
          }
        } catch (err) {
          stats.erros++
          console.error(`[PCP] Erro ${item.id}:`, err)
        }
      }

      if (data.totalPaginas && pagina >= data.totalPaginas) break
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    } catch (err) {
      console.error(`[PCP] Erro página ${pagina}:`, err)
      stats.erros++
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[PCP] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
