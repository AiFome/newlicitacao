// apps/scraper/src/collectors/negocios-publicos.ts
//
// Negócios Públicos (https://www.negociospublicos.com.br) é um dos maiores
// portais privados de licitações do Brasil, com forte presença em SP, MG e RJ.
// Expõe endpoint JSON semipúblico para consulta de editais abertos.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface NPItem {
  id:              string | number
  numero:          string
  descricao:       string
  modalidade:      string
  dataAbertura:    string   // ISO 8601
  dataPublicacao?: string
  valorEstimado?:  number
  uf:              string
  municipio?:      string
  url?:            string
  orgao: {
    id?:    string | number
    nome:   string
    cnpj?:  string
    esfera?: string
  }
}

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregão eletrônico':  Modalidade.PREGAO_ELETRONICO,
  'pregão presencial':  Modalidade.PREGAO_PRESENCIAL,
  'concorrência':       Modalidade.CONCORRENCIA,
  'tomada de preços':   Modalidade.TOMADA_DE_PRECOS,
  'convite':            Modalidade.CONVITE,
  'leilão':             Modalidade.LEILAO,
  'dispensa':           Modalidade.DISPENSA,
  'inexigibilidade':    Modalidade.INEXIGIBILIDADE,
  'credenciamento':     Modalidade.CREDENCIAMENTO,
  'rdc':                Modalidade.RDC,
}

function normModalidade(texto: string): Modalidade {
  const lower = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  for (const [k, v] of Object.entries(MODALIDADE_MAP)) {
    const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (lower.includes(kNorm)) return v
  }
  return Modalidade.PREGAO_ELETRONICO
}

function normEsfera(v?: string): Esfera {
  const s = (v ?? '').toLowerCase()
  if (s.includes('federal')) return Esfera.FEDERAL
  if (s.includes('estadual')) return Esfera.ESTADUAL
  if (s.includes('distrital')) return Esfera.DISTRITAL
  return Esfera.MUNICIPAL
}

function criarCliente(): AxiosInstance {
  const client = axios.create({
    baseURL: 'https://www.negociospublicos.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.negociospublicos.com.br/',
    },
  })

  client.interceptors.response.use(undefined, async (err) => {
    const config = err.config
    config._retries = (config._retries ?? 0) + 1
    if (config._retries <= 3 && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT')) {
      await new Promise((r) => setTimeout(r, 2000 * config._retries))
      return client.request(config)
    }
    return Promise.reject(err)
  })

  return client
}

async function upsertOrgaoNP(item: NPItem) {
  const cnpj = item.orgao.cnpj ?? `NP:${item.orgao.id ?? item.orgao.nome.substring(0, 40)}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: item.orgao.nome.trim(),
      esfera:      normEsfera(item.orgao.esfera),
      poder:       Poder.EXECUTIVO,
      uf:          item.uf.trim().toUpperCase().substring(0, 2) || 'BR',
      municipio:   item.municipio?.trim() ?? null,
    },
    update: { razaoSocial: item.orgao.nome.trim() },
  })
}

export interface NegociosPublicosStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarNegociosPublicos(opts: {
  paginas?: number
  uf?:      string
}): Promise<NegociosPublicosStats> {
  const stats: NegociosPublicosStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[Negócios Públicos] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        situacao:  'A',
        pagina,
        tamanho:   50,
        ordenacao: 'dataAbertura',
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/licitacoes/publicas', { params })
      const data = resp.data as {
        conteudo:    NPItem[]
        totalItens:  number
        totalPaginas:number
      } | null

      if (!data?.conteudo?.length) {
        console.log(`[Negócios Públicos] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.conteudo.length
      console.log(`[Negócios Públicos] Página ${pagina}/${data.totalPaginas}: ${data.conteudo.length} itens`)

      for (const item of data.conteudo) {
        try {
          if (!item.descricao) { stats.erros++; continue }

          const orgao         = await upsertOrgaoNP(item)
          const codigoExterno = `NP:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.NEGOCIOS_PUBLICOS, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.NEGOCIOS_PUBLICOS, codigoExterno } },
            create: {
              numeroEdital:  item.numero || String(item.id),
              titulo:        item.descricao.substring(0, 255),
              objeto:        item.descricao,
              modalidade:    normModalidade(item.modalidade),
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valorEstimado ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.url ?? `https://www.negociospublicos.com.br/licitacao/${item.id}`,
              portalOrigem:  Portal.NEGOCIOS_PUBLICOS,
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
          console.error(`[Negócios Públicos] Erro ${item.id}:`, err)
        }
      }

      if (pagina >= data.totalPaginas) break
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800))
    } catch (err) {
      stats.erros++
      console.error(`[Negócios Públicos] Erro página ${pagina}:`, err)
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[Negócios Públicos] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
