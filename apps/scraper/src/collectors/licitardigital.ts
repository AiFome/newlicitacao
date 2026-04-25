// apps/scraper/src/collectors/licitardigital.ts
//
// LicitarDigital (https://www.licitardigital.com.br) é uma plataforma privada
// com foco em estados do Sul e Sudeste. Expõe API REST para consulta pública
// de editais abertos.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface LicitarDigitalItem {
  id:              string
  numeroProcesso:  string
  descricao:       string
  tipoLicitacao:   number
  dataAbertura:    string   // ISO 8601
  dataPublicacao?: string
  valorTotal?:     number
  uf:              string
  municipio?:      string
  urlEdital?:      string
  entidade: {
    id:             string
    nome:           string
    cnpj?:          string
    esfera?:        string
  }
}

const TIPO_MAP: Record<number, Modalidade> = {
  1:  Modalidade.PREGAO_ELETRONICO,
  2:  Modalidade.PREGAO_PRESENCIAL,
  3:  Modalidade.CONCORRENCIA,
  4:  Modalidade.TOMADA_DE_PRECOS,
  5:  Modalidade.CONVITE,
  6:  Modalidade.LEILAO,
  7:  Modalidade.CONCURSO,
  8:  Modalidade.DISPENSA,
  9:  Modalidade.INEXIGIBILIDADE,
  10: Modalidade.CREDENCIAMENTO,
  11: Modalidade.RDC,
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.licitardigital.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  })
}

async function upsertOrgaoLD(entidade: LicitarDigitalItem['entidade'], uf: string, municipio?: string) {
  const cnpj = entidade.cnpj ?? `LD:${entidade.id}`
  const esfera = entidade.esfera?.toLowerCase().includes('federal')
    ? Esfera.FEDERAL
    : entidade.esfera?.toLowerCase().includes('estadual')
    ? Esfera.ESTADUAL
    : Esfera.MUNICIPAL

  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: entidade.nome.trim(),
      esfera,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'BR',
      municipio:   municipio?.trim() ?? null,
    },
    update: { razaoSocial: entidade.nome.trim() },
  })
}

export interface LicitarDigitalStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarLicitarDigital(opts: {
  paginas?: number
  uf?:      string
}): Promise<LicitarDigitalStats> {
  const stats: LicitarDigitalStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[LicitarDigital] Iniciando coleta…')

  for (let pagina = 0; pagina < maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        situacao: 0,         // 0 = abertas
        page:     pagina,
        size:     50,
        sort:     'dataAbertura,asc',
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/public/licitacoes', { params })
      const data = resp.data as {
        content:       LicitarDigitalItem[]
        totalPages:    number
        totalElements: number
        last:          boolean
      } | null

      if (!data?.content?.length) {
        console.log(`[LicitarDigital] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.content.length
      console.log(`[LicitarDigital] Página ${pagina + 1}/${data.totalPages}: ${data.content.length} itens`)

      for (const item of data.content) {
        try {
          const orgao         = await upsertOrgaoLD(item.entidade, item.uf, item.municipio)
          const codigoExterno = `LD:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITARDIGITAL, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITARDIGITAL, codigoExterno } },
            create: {
              numeroEdital:  item.numeroProcesso || item.id,
              titulo:        item.descricao.substring(0, 255),
              objeto:        item.descricao,
              modalidade:    TIPO_MAP[item.tipoLicitacao] ?? Modalidade.PREGAO_ELETRONICO,
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valorTotal ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.urlEdital ?? `https://www.licitardigital.com.br/licitacoes/${item.id}`,
              portalOrigem:  Portal.LICITARDIGITAL,
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
          console.error(`[LicitarDigital] Erro ${item.id}:`, err)
        }
      }

      if (data.last) break
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    } catch (err) {
      console.error(`[LicitarDigital] Erro página ${pagina}:`, err)
      stats.erros++
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[LicitarDigital] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
