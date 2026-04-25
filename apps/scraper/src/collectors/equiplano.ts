// apps/scraper/src/collectors/equiplano.ts
//
// Equiplano (https://www.equiplano.com.br) é uma plataforma de gestão pública
// muito usada por municípios do interior de São Paulo.
// Acessa o módulo de licitações via endpoint REST semipúblico.

import axios, { type AxiosInstance } from 'axios'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

interface EquiplanoItem {
  id:               number | string
  numero:           string
  descricao:        string
  modalidade:       number   // código numérico
  dataAbertura:     string
  dataPublicacao?:  string
  valorEstimado?:   number
  municipio:        string
  uf:               string
  link?:            string
  entidade: {
    nome:   string
    cnpj?:  string
    id?:    number | string
  }
}

const MODALIDADE_MAP: Record<number, Modalidade> = {
  1:  Modalidade.CONCORRENCIA,
  2:  Modalidade.TOMADA_DE_PRECOS,
  3:  Modalidade.CONVITE,
  4:  Modalidade.CONCURSO,
  5:  Modalidade.LEILAO,
  6:  Modalidade.DISPENSA,
  7:  Modalidade.INEXIGIBILIDADE,
  8:  Modalidade.PREGAO_ELETRONICO,
  9:  Modalidade.PREGAO_PRESENCIAL,
  10: Modalidade.CREDENCIAMENTO,
  11: Modalidade.RDC,
  12: Modalidade.MANIFESTACAO_INTERESSE,
}

function criarCliente(): AxiosInstance {
  return axios.create({
    baseURL: 'https://www.equiplano.com.br',
    timeout: 15_000,
    headers: {
      'User-Agent':      process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0',
      'Accept':          'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer':         'https://www.equiplano.com.br/',
    },
  })
}

async function upsertOrgaoEq(entidade: EquiplanoItem['entidade'], uf: string, municipio: string) {
  const cnpj = entidade.cnpj ?? `EQ:${entidade.id ?? entidade.nome.substring(0, 40)}`
  return prisma.orgao.upsert({
    where:  { cnpj },
    create: {
      cnpj,
      razaoSocial: entidade.nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2) || 'SP',
      municipio:   municipio.trim() || null,
    },
    update: { razaoSocial: entidade.nome.trim() },
  })
}

export interface EquiplanoStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarEquiplano(opts: {
  paginas?: number
  uf?:      string
}): Promise<EquiplanoStats> {
  const stats: EquiplanoStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 10
  const client     = criarCliente()

  console.log('[Equiplano] Iniciando coleta…')

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const params: Record<string, string | number> = {
        status: 1,     // 1 = aberta
        pagina,
        limite: 50,
      }
      if (opts.uf) params['uf'] = opts.uf

      const resp = await client.get('/api/licitacoes', { params })
      const data = resp.data as {
        data:        EquiplanoItem[]
        lastPage?:   number
        total?:      number
      } | null

      if (!data?.data?.length) {
        console.log(`[Equiplano] Página ${pagina} sem dados`)
        break
      }

      stats.total += data.data.length
      console.log(`[Equiplano] Página ${pagina}: ${data.data.length} itens`)

      for (const item of data.data) {
        try {
          if (!item.descricao) { stats.erros++; continue }

          const orgao         = await upsertOrgaoEq(item.entidade, item.uf, item.municipio)
          const codigoExterno = `EQ:${item.id}`
          const dataAbertura  = item.dataAbertura ? new Date(item.dataAbertura) : new Date()
          const dataPublicacao = item.dataPublicacao ? new Date(item.dataPublicacao) : dataAbertura

          const existing = await prisma.licitacao.findUnique({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.EQUIPLANO, codigoExterno } },
            select: { id: true },
          })

          const licitacao = await prisma.licitacao.upsert({
            where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.EQUIPLANO, codigoExterno } },
            create: {
              numeroEdital:  item.numero || String(item.id),
              titulo:        item.descricao.substring(0, 255),
              objeto:        item.descricao,
              modalidade:    MODALIDADE_MAP[item.modalidade] ?? Modalidade.PREGAO_ELETRONICO,
              situacao:      Situacao.ABERTA,
              valorEstimado: item.valorEstimado ?? null,
              dataPublicacao,
              dataAbertura,
              linkEdital:    item.link ?? `https://www.equiplano.com.br/licitacoes/${item.id}`,
              portalOrigem:  Portal.EQUIPLANO,
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
          console.error(`[Equiplano] Erro ${item.id}:`, err)
        }
      }

      if (data.lastPage && pagina >= data.lastPage) break
      await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000))
    } catch (err) {
      stats.erros++
      console.error(`[Equiplano] Erro página ${pagina}:`, err)
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        await new Promise((r) => setTimeout(r, 60_000))
      } else break
    }
  }

  console.log(`[Equiplano] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
