// apps/scraper/src/collectors/citacon.ts
//
// Citacon (https://www.citacon.com.br) é um portal de licitações focado
// em municípios gaúchos (RS). Coleta via API JSON semipública.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface CitaconItem {
  id:              string | number
  numero:          string
  objeto:          string
  modalidade:      string
  dataAbertura:    string
  dataPublicacao?: string
  valorEstimado?:  number
  municipio:       string
  uf:              string
  urlEdital?:      string
  orgao: {
    nome:   string
    cnpj?:  string
    id?:    string | number
  }
}

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregao_eletronico':  Modalidade.PREGAO_ELETRONICO,
  'pregao_presencial':  Modalidade.PREGAO_PRESENCIAL,
  'pregao eletrônico':  Modalidade.PREGAO_ELETRONICO,
  'pregão eletrônico':  Modalidade.PREGAO_ELETRONICO,
  'concorrencia':       Modalidade.CONCORRENCIA,
  'concorrência':       Modalidade.CONCORRENCIA,
  'tomada_precos':      Modalidade.TOMADA_DE_PRECOS,
  'tomada de preços':   Modalidade.TOMADA_DE_PRECOS,
  'convite':            Modalidade.CONVITE,
  'leilao':             Modalidade.LEILAO,
  'leilão':             Modalidade.LEILAO,
  'dispensa':           Modalidade.DISPENSA,
  'inexigibilidade':    Modalidade.INEXIGIBILIDADE,
  'credenciamento':     Modalidade.CREDENCIAMENTO,
}

function normModalidade(texto: string): Modalidade {
  const key = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').trim()
  return MODALIDADE_MAP[key] ?? MODALIDADE_MAP[texto.toLowerCase().trim()] ?? Modalidade.PREGAO_ELETRONICO
}

function criarCliente(): AxiosInstance {
  const client = axios.create({
    baseURL: 'https://www.citacon.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.citacon.com.br/',
    },
  })

  client.interceptors.response.use(undefined, async (err) => {
    const config = err.config
    config._retries = (config._retries ?? 0) + 1
    if (config._retries <= 2 && err.code === 'ECONNRESET') {
      await new Promise((r) => setTimeout(r, 2000 * config._retries))
      return client.request(config)
    }
    return Promise.reject(err)
  })

  return client
}

async function upsertOrgaoCitacon(orgao: CitaconItem['orgao'], uf: string, municipio: string) {
  const cnpj = orgao.cnpj ?? `CITA:${orgao.id ?? orgao.nome.substring(0, 40)}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: orgao.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'RS',
      municipio:   municipio.trim() || null,
    },
    update: { razaoSocial: orgao.nome.trim() },
  })
}

export interface CitaconStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarCitacon(opts: {
  paginas?: number
  uf?:      string
}): Promise<CitaconStats> {
  const stats: CitaconStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 8
  const client     = criarCliente()

  console.log('[Citacon] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        situacao: 'ABERTA',
        pagina,
        limite:   50,
        uf:       opts.uf ?? 'RS',
      }

      const resp = await client.get('/api/v1/licitacoes/abertas', { params })
      const data = resp.data as {
        licitacoes:    CitaconItem[]
        totalPaginas?: number
        total?:        number
      } | null

      if (!data?.licitacoes?.length) {
        console.log(`[Citacon] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.licitacoes.length
      console.log(`[Citacon] Página ${pagina}: ${data.licitacoes.length} itens`)

      for (const item of data.licitacoes) {
        try {
          if (!item.objeto) { stats.erros++; continue }

          const orgao         = await upsertOrgaoCitacon(item.orgao, item.uf, item.municipio)
          const codigoExterno = `CITA:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.CITACON, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.CITACON, codigoExterno } },
            create: {
              numeroEdital:  item.numero || String(item.id),
              titulo:        item.objeto.substring(0, 255),
              objeto:        item.objeto,
              modalidade:    normModalidade(item.modalidade),
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valorEstimado ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.urlEdital ?? `https://www.citacon.com.br/licitacoes/${item.id}`,
              portalOrigem:  Portal.CITACON,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'RS',
              municipio:     item.municipio?.trim() || null,
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
          console.error(`[Citacon] Erro ${item.id}:`, err)
        }
      }

      if (data.totalPaginas && pagina >= data.totalPaginas) break
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800))
    } catch (err) {
      stats.erros++
      console.error(`[Citacon] Erro página ${pagina}:`, err)
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[Citacon] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
