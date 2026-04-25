// apps/scraper/src/collectors/comprasnet.ts
//
// Comprasnet (https://www.comprasnet.gov.br) é o portal de compras do governo federal.
// Coleta via endpoint de busca público (sem autenticação) retornando JSON/HTML.
// Endpoint descoberto via análise de tráfego de rede do portal.

import axios, { type AxiosInstance } from 'axios'
import * as cheerio from 'cheerio'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

// ── Mapeamentos ──────────────────────────────────────────────
const MODALIDADE_MAP: Record<string, Modalidade> = {
  '1':  Modalidade.CONCORRENCIA,
  '2':  Modalidade.TOMADA_DE_PRECOS,
  '3':  Modalidade.CONVITE,
  '4':  Modalidade.CONCURSO,
  '5':  Modalidade.LEILAO,
  '6':  Modalidade.DISPENSA,
  '7':  Modalidade.INEXIGIBILIDADE,
  '22': Modalidade.PREGAO_ELETRONICO,
  '23': Modalidade.PREGAO_PRESENCIAL,
  '24': Modalidade.RDC,
}

const SITUACAO_MAP: Record<string, Situacao> = {
  'A': Situacao.ABERTA,
  'R': Situacao.REVOGADA,
  'N': Situacao.ANULADA,
  'H': Situacao.HOMOLOGADA,
  'E': Situacao.ENCERRADA,
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.comprasnet.gov.br',
    timeout: 20_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':          'application/json, text/html, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.comprasnet.gov.br/',
    },
  })
}

async function upsertOrgao(uasg: string, nomeOrgao: string, uf: string) {
  return prisma.orgao.upsert({
    where:  { uasg },
    create: {
      cnpj:        `UASG:${uasg}`,
      razaoSocial: nomeOrgao.trim(),
      esfera:      Esfera.FEDERAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'BR',
      uasg,
    },
    update: { razaoSocial: nomeOrgao.trim() },
  })
}

export interface ComprasnetStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarComprasnet(opts: {
  paginas?: number
  uf?:      string
  dias?:    number   // quantos dias atrás buscar publicações
}): Promise<ComprasnetStats> {
  const stats: ComprasnetStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  // Data de referência
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - (opts.dias ?? 30))
  const dtStr = dataInicio.toLocaleDateString('pt-BR')  // DD/MM/YYYY

  console.log(`[Comprasnet] Iniciando coleta (${maxPaginas} páginas)…`)

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      // Endpoint público de consulta de pregões eletrônicos abertos
      const params: Record<string, string | number> = {
        lstTipo:      'E',   // Pregão Eletrônico
        SrpOrgao:     opts.uf ? opts.uf : '',
        dtPublicacao: dtStr,
        paginaAtual:  pagina,
        tamPagina:    50,
      }

      const resp = await client.post(
        '/ConsultaLicitacoes/Download?siglaUf=&codigoUnidadeCompradora=&tipoModalidade=&numeroPregao=&anoAtual=&palavra=',
        new URLSearchParams(params as Record<string, string>),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      const $ = cheerio.load(resp.data)
      const rows = $('table tbody tr')

      if (!rows.length) {
        console.log(`[Comprasnet] Página ${pagina} sem dados — fim`)
        break
      }

      const licitacoes: Array<{
        uasg: string; orgao: string; numero: string; objeto: string
        modalidadeId: string; dataAbertura: string; uf: string; link: string
      }> = []

      rows.each((_, row) => {
        const cols = $(row).find('td').map((_, td) => $(td).text().trim()).get()
        if (cols.length >= 5) {
          licitacoes.push({
            uasg:         cols[0] ?? '',
            orgao:        cols[1] ?? '',
            numero:       cols[2] ?? '',
            objeto:       cols[3] ?? '',
            modalidadeId: '22', // Pregão Eletrônico (endpoint específico)
            dataAbertura: cols[4] ?? '',
            uf:           cols[5] ?? 'BR',
            link:         $(row).find('a').attr('href') ?? '',
          })
        }
      })

      if (!licitacoes.length) break

      stats.total += licitacoes.length
      console.log(`[Comprasnet] Página ${pagina}: ${licitacoes.length} itens`)

      for (const item of licitacoes) {
        try {
          if (!item.numero || !item.objeto) { stats.erros++; continue }

          const orgao         = await upsertOrgao(item.uasg || `CN:${item.orgao}`, item.orgao || 'Órgão Federal', item.uf)
          const codigoExterno = `CN:${item.uasg}:${item.numero}`

          // Parse de data brasileira DD/MM/YYYY [HH:mm]
          const [datePart]    = (item.dataAbertura || '').split(' ')
          const [d, m, y]     = (datePart || '').split('/').map(Number)
          const dataAbertura  = d && m && y ? new Date(y, m - 1, d, 10, 0) : new Date()

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.COMPRASNET, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.COMPRASNET, codigoExterno } },
            create: {
              numeroEdital:  item.numero,
              titulo:        item.objeto.substring(0, 255),
              objeto:        item.objeto,
              modalidade:    MODALIDADE_MAP[item.modalidadeId] ?? Modalidade.PREGAO_ELETRONICO,
              situacao:      Situacao.ABERTA,
              dataPublicacao:dataAbertura,
              dataAbertura,
              linkEdital:    item.link ? `https://www.comprasnet.gov.br${item.link}` : `https://www.comprasnet.gov.br/acesso.asp?funcao=listar&search=pregao&uasg=${item.uasg}`,
              portalOrigem:  Portal.COMPRASNET,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'BR',
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
          console.error(`[Comprasnet] Erro item ${item.numero}:`, err)
        }
      }

      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500))
    } catch (err) {
      console.error(`[Comprasnet] Erro página ${pagina}:`, err)
      stats.erros++
      break
    }
  }

  console.log(`[Comprasnet] Concluído: ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
