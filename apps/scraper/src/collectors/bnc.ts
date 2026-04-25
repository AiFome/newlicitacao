// apps/scraper/src/collectors/bnc.ts
//
// O BNC (https://bnc.org.br) expõe um endpoint de busca JSON não documentado
// que pode ser chamado diretamente via HTTP — sem necessidade de browser.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

// ── HTTP client com retry e headers realistas ────────────────
function criarCliente(): AxiosInstance {
  const client = axios.create({
    baseURL: 'https://bnc.org.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept':          'application/json, text/html, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://bnc.org.br/',
    },
  })

  // Retry automático em erros de rede
  client.interceptors.response.use(undefined, async (err) => {
    const config = err.config
    config._retries = (config._retries ?? 0) + 1
    if (config._retries <= 3 && err.code === 'ECONNRESET') {
      await new Promise((r) => setTimeout(r, 1000 * config._retries))
      return client.request(config)
    }
    return Promise.reject(err)
  })

  return client
}

// ── Tipos da resposta BNC ───────────────────────────────────
interface BncItem {
  id:           string
  numero:       string
  objeto:       string
  modalidade:   string
  situacao:     string
  valorEstimado?: number
  dataAbertura: string
  orgao: {
    nome: string
    cnpj: string
    uf:   string
    municipio?: string
  }
  link?: string
}

const MODALIDADE_BNC: Record<string, Modalidade> = {
  '1': Modalidade.PREGAO_ELETRONICO,
  '2': Modalidade.PREGAO_PRESENCIAL,
  '3': Modalidade.CONCORRENCIA,
  '4': Modalidade.TOMADA_DE_PRECOS,
  '5': Modalidade.CONVITE,
  '6': Modalidade.DISPENSA,
  '7': Modalidade.INEXIGIBILIDADE,
  '8': Modalidade.LEILAO,
  '9': Modalidade.CONCURSO,
}

function normalizarModalidadeBnc(val: string): Modalidade {
  return MODALIDADE_BNC[val] ?? Modalidade.PREGAO_ELETRONICO
}

async function upsertOrgaoBnc(orgao: BncItem['orgao']) {
  return prisma.orgao.upsert({
    where:  { cnpj: orgao.cnpj },
    create: {
      cnpj:        orgao.cnpj,
      razaoSocial: orgao.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          orgao.uf.trim().toUpperCase().substring(0, 2),
      municipio:   orgao.municipio?.trim() ?? null,
    },
    update: { razaoSocial: orgao.nome.trim() },
  })
}

// ── Coleta principal ────────────────────────────────────────
export interface BncStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarBNC(opts: {
  paginas?: number
  uf?:      string
}): Promise<BncStats> {
  const stats: BncStats  = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas        = opts.paginas ?? 10
  const client            = criarCliente()

  console.log('[BNC] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      // Endpoint de busca do BNC — parâmetros descobertos via análise do tráfego de rede
      const params: Record<string, string | number> = {
        situacao: 1, // abertas
        pagina,
        porPagina: 50,
        ordenacao: 'dataAbertura',
        ordem:     'asc',
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/licitacoes', { params })
      const data = resp.data as { items: BncItem[]; totalPaginas: number } | null

      if (!data?.items?.length) {
        console.log(`[BNC] Página ${pagina} vazia — fim`)
        break
      }

      stats.total += data.items.length
      console.log(`[BNC] Página ${pagina}/${Math.min(maxPaginas, data.totalPaginas)}: ${data.items.length} itens`)

      for (const item of data.items) {
        try {
          if (!item.orgao?.cnpj || !item.objeto) {
            stats.erros++
            continue
          }

          const orgao        = await upsertOrgaoBnc(item.orgao)
          const codigoExterno = `BNC:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.BNC, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.BNC, codigoExterno } },
            create: {
              numeroEdital:   item.numero || item.id,
              titulo:         item.objeto.substring(0, 255),
              objeto:         item.objeto,
              modalidade:     normalizarModalidadeBnc(item.modalidade),
              situacao:       Situacao.ABERTA,
              valorEstimado:  item.valorEstimado ?? null,
              dataPublicacao: dataAbertura,
              dataAbertura,
              linkEdital:     item.link ?? `https://bnc.org.br/licitacao/${item.id}`,
              portalOrigem:   Portal.BNC,
              codigoExterno,
              anoCompra:      dataAbertura.getFullYear(),
              uf:             item.orgao.uf.trim().toUpperCase().substring(0, 2),
              municipio:      item.orgao.municipio?.trim() ?? null,
              orgaoId:        orgao.id,
            },
            update: {
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valorEstimado ?? null,
              updatedAt:     new Date(),
            },
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
          console.error(`[BNC] Erro ao processar ${item.id}:`, err)
        }
      }

      if (pagina >= data.totalPaginas) break

      // Delay entre páginas
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))

    } catch (err) {
      console.error(`[BNC] Erro na página ${pagina}:`, err)
      stats.erros++
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        console.warn('[BNC] Rate limited — aguardando 60s')
        await new Promise((r) => setTimeout(r, 60_000))
      } else {
        break
      }
    }
  }

  console.log(`[BNC] Coleta finalizada: ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
