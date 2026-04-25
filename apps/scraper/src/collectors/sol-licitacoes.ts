// apps/scraper/src/collectors/sol-licitacoes.ts
//
// Sol Licitações (https://www.sollicitacoes.com.br) é um portal com forte
// presença nos municípios de SC, RS e PR. Usa endpoint REST para consulta pública.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface SolItem {
  id:               string | number
  numeroProcesso:   string
  objeto:           string
  tipo:             string       // modalidade
  dataAbertura:     string
  dataPublicacao?:  string
  valor?:           number
  uf:               string
  cidade?:          string
  linkEdital?:      string
  entidade: {
    nome:   string
    cnpj?:  string
    codigo?: string
  }
}

const TIPO_MAP: Record<string, Modalidade> = {
  'PE':  Modalidade.PREGAO_ELETRONICO,
  'PP':  Modalidade.PREGAO_PRESENCIAL,
  'CC':  Modalidade.CONCORRENCIA,
  'TP':  Modalidade.TOMADA_DE_PRECOS,
  'CV':  Modalidade.CONVITE,
  'LE':  Modalidade.LEILAO,
  'CN':  Modalidade.CONCURSO,
  'DI':  Modalidade.DISPENSA,
  'IN':  Modalidade.INEXIGIBILIDADE,
  'CR':  Modalidade.CREDENCIAMENTO,
}

function normModalidade(tipo: string): Modalidade {
  return TIPO_MAP[tipo.toUpperCase().trim()] ?? Modalidade.PREGAO_ELETRONICO
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.sollicitacoes.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.sollicitacoes.com.br/',
    },
  })
}

async function upsertOrgaoSol(entidade: SolItem['entidade'], uf: string, cidade?: string) {
  const cnpj = entidade.cnpj ?? `SOL:${entidade.codigo ?? entidade.nome.substring(0, 40)}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: entidade.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'SC',
      municipio:   cidade?.trim() ?? null,
    },
    update: { razaoSocial: entidade.nome.trim() },
  })
}

export interface SolStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarSolLicitacoes(opts: {
  paginas?: number
  uf?:      string
}): Promise<SolStats> {
  const stats: SolStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[Sol Licitações] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        situacao: 'ABERTA',
        pagina,
        limite:   50,
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/public/processos/abertos', { params })
      const data = resp.data as {
        itens:         SolItem[]
        totalPaginas?: number
        total?:        number
      } | null

      if (!data?.itens?.length) {
        console.log(`[Sol Licitações] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.itens.length
      console.log(`[Sol Licitações] Página ${pagina}: ${data.itens.length} itens`)

      for (const item of data.itens) {
        try {
          if (!item.objeto) { stats.erros++; continue }

          const orgao         = await upsertOrgaoSol(item.entidade, item.uf, item.cidade)
          const codigoExterno = `SOL:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.SOL_LICITACOES, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.SOL_LICITACOES, codigoExterno } },
            create: {
              numeroEdital:  item.numeroProcesso || String(item.id),
              titulo:        item.objeto.substring(0, 255),
              objeto:        item.objeto,
              modalidade:    normModalidade(item.tipo),
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valor ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.linkEdital ?? `https://www.sollicitacoes.com.br/processo/${item.id}`,
              portalOrigem:  Portal.SOL_LICITACOES,
              codigoExterno,
              anoCompra:     dataAbertura.getFullYear(),
              uf:            item.uf.trim().toUpperCase().substring(0, 2) || 'SC',
              municipio:     item.cidade?.trim() ?? null,
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
          console.error(`[Sol Licitações] Erro ${item.id}:`, err)
        }
      }

      if (data.totalPaginas && pagina >= data.totalPaginas) break
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    } catch (err) {
      stats.erros++
      console.error(`[Sol Licitações] Erro página ${pagina}:`, err)
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[Sol Licitações] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
