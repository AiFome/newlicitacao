// apps/scraper/src/collectors/licitacoes-e.ts
//
// Licitações-e (https://www.licitacoes-e.com.br) é o portal do Banco do Brasil
// para pregões eletrônicos. Expõe endpoint REST semipúblico sem autenticação
// para consulta de editais abertos.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface LicitacoesEItem {
  codigoEdital:    string
  numero:          string
  descricao:       string
  dataAbertura:    string     // ISO 8601
  dataPublicacao:  string
  situacao:        string
  modalidade:      string
  valor?:          number
  uf:              string
  municipio?:      string
  orgao: {
    codigo:        string
    nome:          string
    cnpj?:         string
  }
}

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'PE':  Modalidade.PREGAO_ELETRONICO,
  'PP':  Modalidade.PREGAO_PRESENCIAL,
  'CC':  Modalidade.CONCORRENCIA,
  'TP':  Modalidade.TOMADA_DE_PRECOS,
  'CV':  Modalidade.CONVITE,
  'LE':  Modalidade.LEILAO,
  'CN':  Modalidade.CONCURSO,
  'DI':  Modalidade.DISPENSA,
  'II':  Modalidade.INEXIGIBILIDADE,
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.licitacoes-e.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  })
}

async function upsertOrgao(item: LicitacoesEItem) {
  const cnpj = item.orgao.cnpj ?? `LE:${item.orgao.codigo}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: item.orgao.nome.trim(),
      esfera:      Esfera.ESTADUAL,
      poder:       Poder.EXECUTIVO,
      uf:          item.uf.trim().toUpperCase().substring(0, 2) || 'BR',
      municipio:   item.municipio?.trim() ?? null,
    },
    update: { razaoSocial: item.orgao.nome.trim() },
  })
}

export interface LicitacoesEStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarLicitacoesE(opts: {
  paginas?: number
  uf?:      string
}): Promise<LicitacoesEStats> {
  const stats: LicitacoesEStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[Licitações-e] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        situacao: 'A',        // Abertas
        pagina,
        tamanhoPagina: 50,
        ordenacao:     'dataAbertura',
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/ws/rest/editais', { params })
      const data = resp.data as {
        conteudo:      LicitacoesEItem[]
        totalPaginas:  number
        totalElements: number
      } | null

      if (!data?.conteudo?.length) {
        console.log(`[Licitações-e] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.conteudo.length
      console.log(`[Licitações-e] Página ${pagina}/${data.totalPaginas}: ${data.conteudo.length} itens`)

      for (const item of data.conteudo) {
        try {
          const orgao        = await upsertOrgao(item)
          const codigoExterno = `LE:${item.codigoEdital}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITACOES_E, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITACOES_E, codigoExterno } },
            create: {
              numeroEdital:  item.numero || item.codigoEdital,
              titulo:        item.descricao.substring(0, 255),
              objeto:        item.descricao,
              modalidade:    MODALIDADE_MAP[item.modalidade] ?? Modalidade.PREGAO_ELETRONICO,
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valor ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    `https://www.licitacoes-e.com.br/aop/detalhe-edital.aop?idLicitacao=${item.codigoEdital}`,
              portalOrigem:  Portal.LICITACOES_E,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'BR',
              municipio:     item.municipio?.trim() ?? null,
              orgaoId:       orgao.id,
            },
            update: { situacao: Situacao.ABERTA, updatedAt: new Date() },
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
          console.error(`[Licitações-e] Erro ${item.codigoEdital}:`, err)
        }
      }

      if (pagina >= data.totalPaginas) break
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    } catch (err) {
      console.error(`[Licitações-e] Erro página ${pagina}:`, err)
      stats.erros++
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[Licitações-e] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
