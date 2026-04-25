// apps/scraper/src/collectors/licitacon.ts
//
// LicitaCon (https://www.licitacon.com.br) é um portal especializado em
// câmaras municipais e autarquias do estado de São Paulo.
// Coleta via endpoint JSON / HTML com Cheerio.

import axios, { type AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface LicitaconItem {
  id:              string | number
  numero:          string
  objeto:          string
  modalidade:      string
  dataAbertura:    string
  dataPublicacao?: string
  valor?:          number | string
  municipio:       string
  uf:              string
  link?:           string
  entidade: {
    nome:   string
    cnpj?:  string
    id?:    string | number
    tipo?:  string   // 'CAMARA', 'PREFEITURA', 'AUTARQUIA'
  }
}

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregao eletronico':  Modalidade.PREGAO_ELETRONICO,
  'pregao presencial':  Modalidade.PREGAO_PRESENCIAL,
  'pregão eletrônico':  Modalidade.PREGAO_ELETRONICO,
  'pregão presencial':  Modalidade.PREGAO_PRESENCIAL,
  'concorrencia':       Modalidade.CONCORRENCIA,
  'concorrência':       Modalidade.CONCORRENCIA,
  'tomada de precos':   Modalidade.TOMADA_DE_PRECOS,
  'tomada de preços':   Modalidade.TOMADA_DE_PRECOS,
  'convite':            Modalidade.CONVITE,
  'leilao':             Modalidade.LEILAO,
  'leilão':             Modalidade.LEILAO,
  'dispensa':           Modalidade.DISPENSA,
  'inexigibilidade':    Modalidade.INEXIGIBILIDADE,
  'credenciamento':     Modalidade.CREDENCIAMENTO,
}

function normModalidade(texto: string): Modalidade {
  const norm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  for (const [k, v] of Object.entries(MODALIDADE_MAP)) {
    if (norm.includes(k)) return v
  }
  return Modalidade.PREGAO_ELETRONICO
}

function parseValor(v?: number | string): number | null {
  if (!v) return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[R$.\s]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.licitacon.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json, text/html, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.licitacon.com.br/',
    },
  })
}

async function upsertOrgaoLC(entidade: LicitaconItem['entidade'], uf: string, municipio: string) {
  const cnpj = entidade.cnpj ?? `LC:${entidade.id ?? entidade.nome.substring(0, 40)}`
  // LicitaCon foca em câmaras — poder legislativo
  const poder = entidade.tipo?.toLowerCase().includes('camara') ? Poder.LEGISLATIVO : Poder.EXECUTIVO
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: entidade.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'SP',
      municipio:   municipio.trim() || null,
    },
    update: { razaoSocial: entidade.nome.trim() },
  })
}

export interface LicitaconStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarLicitacon(opts: {
  paginas?: number
  uf?:      string
}): Promise<LicitaconStats> {
  const stats: LicitaconStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 8
  const client     = criarCliente()

  console.log('[LicitaCon] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        status: 'aberto',
        pagina,
        limite: 50,
        uf:     opts.uf ?? 'SP',
      }

      let items: LicitaconItem[] = []
      let totalPaginas = 1

      try {
        // Tenta endpoint JSON primeiro
        const resp = await client.get('/api/licitacoes/abertas', { params })
        const data = resp.data as { dados: LicitaconItem[]; totalPaginas?: number } | null
        if (data?.dados) {
          items = data.dados
          totalPaginas = data.totalPaginas ?? 1
        }
      } catch {
        // Fallback para scraping HTML
        const resp = await client.get(`/licitacoes/abertas?pagina=${pagina}&uf=${opts.uf ?? 'SP'}`)
        const $ = cheerio.load(resp.data)

        $('table tbody tr, .licitacao-item').each((_, row) => {
          const cols = $(row).find('td').map((_, td) => $(td).text().trim()).get()
          const link = ($(row).find('a').first().attr('href') ?? '')
          const id   = link.split('/').pop() ?? String(Date.now())
          if (cols.length >= 4) {
            items.push({
              id,
              numero:      cols[0] ?? '',
              objeto:      cols[2] ?? cols[1] ?? '',
              modalidade:  cols[1] ?? 'Pregão Eletrônico',
              dataAbertura:cols[3] ?? new Date().toISOString(),
              municipio:   cols[4] ?? '',
              uf:          opts.uf ?? 'SP',
              link:        link ? `https://www.licitacon.com.br${link}` : '',
              entidade:    { nome: cols[5] ?? 'Câmara Municipal', tipo: 'CAMARA' },
            })
          }
        })
      }

      if (!items.length) {
        console.log(`[LicitaCon] Página ${pagina} sem dados`)
        break
      }

      stats.total += items.length
      console.log(`[LicitaCon] Página ${pagina}: ${items.length} itens`)

      for (const item of items) {
        try {
          if (!item.objeto) { stats.erros++; continue }

          const orgao         = await upsertOrgaoLC(item.entidade, item.uf, item.municipio)
          const codigoExterno = `LC:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITACON, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITACON, codigoExterno } },
            create: {
              numeroEdital:  item.numero || String(item.id),
              titulo:        item.objeto.substring(0, 255),
              objeto:        item.objeto,
              modalidade:    normModalidade(item.modalidade),
              situacao:      Situacao.ABERTA,
              valorEstimado: parseValor(item.valor),
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.link ?? `https://www.licitacon.com.br/licitacoes/${item.id}`,
              portalOrigem:  Portal.LICITACON,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'SP',
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
          console.error(`[LicitaCon] Erro ${item.id}:`, err)
        }
      }

      if (pagina >= totalPaginas) break
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000))
    } catch (err) {
      stats.erros++
      console.error(`[LicitaCon] Erro página ${pagina}:`, err)
      break
    }
  }

  console.log(`[LicitaCon] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
