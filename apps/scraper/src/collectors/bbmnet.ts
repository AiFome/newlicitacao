// apps/scraper/src/collectors/bbmnet.ts
//
// BbmNet (https://www.bbmnet.com.br) é uma plataforma de licitações eletrônicas
// com forte presença em municípios de SP, MG e PR.
// Consulta via endpoint JSON descoberto por análise de tráfego.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface BbmNetItem {
  id:              number | string
  numero:          string
  objeto:          string
  modalidade:      string   // texto: "PREGÃO ELETRÔNICO", "CONCORRÊNCIA", etc.
  dataAbertura:    string   // ISO ou DD/MM/YYYY HH:mm
  dataPublicacao?: string
  valor?:          number
  uf:              string
  municipio?:      string
  link?:           string
  entidade: {
    cnpj?:  string
    nome:   string
    codigo?: string
  }
}

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregão eletrônico':  Modalidade.PREGAO_ELETRONICO,
  'pregão presencial':  Modalidade.PREGAO_PRESENCIAL,
  'pregao eletronico':  Modalidade.PREGAO_ELETRONICO,
  'concorrência':       Modalidade.CONCORRENCIA,
  'concorrencia':       Modalidade.CONCORRENCIA,
  'tomada de preços':   Modalidade.TOMADA_DE_PRECOS,
  'tomada de precos':   Modalidade.TOMADA_DE_PRECOS,
  'convite':            Modalidade.CONVITE,
  'leilão':             Modalidade.LEILAO,
  'leilao':             Modalidade.LEILAO,
  'dispensa':           Modalidade.DISPENSA,
  'inexigibilidade':    Modalidade.INEXIGIBILIDADE,
  'credenciamento':     Modalidade.CREDENCIAMENTO,
}

function normModalidade(texto: string): Modalidade {
  const lower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  for (const [k, v] of Object.entries(MODALIDADE_MAP)) {
    if (lower.includes(k)) return v
  }
  return Modalidade.PREGAO_ELETRONICO
}

function parseDataBbm(texto: string): Date {
  if (!texto) return new Date()
  // Tenta ISO primeiro
  const iso = new Date(texto)
  if (!isNaN(iso.getTime())) return iso
  // Tenta DD/MM/YYYY HH:mm
  const [datePart, timePart] = texto.split(' ')
  const [d, m, y] = (datePart ?? '').split('/').map(Number)
  const [h = 0, min = 0] = (timePart ?? '').split(':').map(Number)
  if (d && m && y) return new Date(y, m - 1, d, h, min)
  return new Date()
}

function criarCliente(): AxiosInstance {
  const client = axios.create({
    baseURL: 'https://www.bbmnet.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json, text/javascript, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'X-Requested-With':'XMLHttpRequest',
      'Referer':         'https://www.bbmnet.com.br/licitacoes',
    },
  })

  // Retry em erros de rede
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

async function upsertOrgaoBbm(entidade: BbmNetItem['entidade'], uf: string, municipio?: string) {
  const cnpj = entidade.cnpj ?? `BBM:${entidade.codigo ?? entidade.nome.substring(0, 40)}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: entidade.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'SP',
      municipio:   municipio?.trim() ?? null,
    },
    update: { razaoSocial: entidade.nome.trim() },
  })
}

export interface BbmNetStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarBbmNet(opts: {
  paginas?: number
  uf?:      string
}): Promise<BbmNetStats> {
  const stats: BbmNetStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[BbmNet] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        status:    'aberto',
        pagina,
        porPagina: 50,
        ordem:     'abertura',
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/licitacoes/abertas', { params })
      const data = resp.data as {
        items:       BbmNetItem[]
        totalPages?: number
        total?:      number
      } | null

      if (!data?.items?.length) {
        console.log(`[BbmNet] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.items.length
      console.log(`[BbmNet] Página ${pagina}: ${data.items.length} itens`)

      for (const item of data.items) {
        try {
          if (!item.objeto) { stats.erros++; continue }

          const orgao         = await upsertOrgaoBbm(item.entidade, item.uf, item.municipio)
          const codigoExterno = `BBM:${item.id}`
          const dataAbertura  = parseDataBbm(item.dataAbertura)
          const dataPublicacao = item.dataPublicacao ? parseDataBbm(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.BBMNET, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.BBMNET, codigoExterno } },
            create: {
              numeroEdital:  item.numero || String(item.id),
              titulo:        item.objeto.substring(0, 255),
              objeto:        item.objeto,
              modalidade:    normModalidade(item.modalidade),
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valor ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.link ?? `https://www.bbmnet.com.br/licitacoes/${item.id}`,
              portalOrigem:  Portal.BBMNET,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'SP',
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
          console.error(`[BbmNet] Erro ${item.id}:`, err)
        }
      }

      if (data.totalPages && pagina >= data.totalPages) break
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1200))
    } catch (err) {
      console.error(`[BbmNet] Erro página ${pagina}:`, err)
      stats.erros++
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[BbmNet] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
