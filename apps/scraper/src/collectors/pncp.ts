// apps/scraper/src/collectors/pncp.ts
import { prisma, Portal, Modalidade, Situacao } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

// Import dinâmico para evitar dependência circular com a API
// Em produção, considere mover alertaEngine para packages/shared
async function dispararAlertas(licitacaoId: string) {
  try {
    // Chama o microserviço interno via HTTP para não acoplar scraper à API
    const apiBase = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
    await fetch(`${apiBase}/internal/alertas/processar`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body:    JSON.stringify({ licitacaoId }),
    })
  } catch {
    // Silencioso — não bloqueia a coleta se a API estiver fora
  }
}

const BASE_URL = process.env.PNCP_API_BASE_URL ?? 'https://pncp.gov.br/api/consulta/v1'

// Mapeamento da API PNCP para nossos enums
const MODALIDADE_MAP: Record<number, Modalidade> = {
  1:  Modalidade.LEILAO,
  2:  Modalidade.DISPENSA,
  3:  Modalidade.INEXIGIBILIDADE,
  4:  Modalidade.CONCORRENCIA,
  5:  Modalidade.CONCURSO,
  6:  Modalidade.PREGAO_ELETRONICO,
  7:  Modalidade.PREGAO_PRESENCIAL,
  8:  Modalidade.RDC,
  9:  Modalidade.CREDENCIAMENTO,
  10: Modalidade.MANIFESTACAO_INTERESSE,
}

const SITUACAO_MAP: Record<number, Situacao> = {
  1: Situacao.ABERTA,
  2: Situacao.SUSPENSA,
  3: Situacao.REVOGADA,
  4: Situacao.ANULADA,
  5: Situacao.HOMOLOGADA,
  6: Situacao.DESERTA,
  7: Situacao.FRACASSADA,
}

interface PncpContratacao {
  numeroControlePNCP: string
  numeroCompra: string
  objetoCompra: string
  informacaoComplementar?: string
  modalidadeId: number
  situacaoCompraId: number
  valorTotalEstimado?: number
  valorTotalHomologado?: number
  dataPublicacaoPncp: string
  dataAberturaProposta?: string
  dataEncerramentoProposta?: string
  linkSistemaOrigem?: string
  orgaoEntidade: {
    cnpj: string
    razaoSocial: string
    esferaId: number
    poderId: string
    municipio?: string
    uf?: string
    codigoUasg?: string
  }
  anoCompra: number
  sequencialCompra: number
}

async function fetchPncp(path: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const resp = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!resp.ok) {
    throw new Error(`PNCP API error: ${resp.status} ${resp.statusText}`)
  }

  return resp.json() as Promise<{
    data: PncpContratacao[]
    totalRegistros: number
    totalPaginas: number
  }>
}

async function upsertOrgao(orgao: PncpContratacao['orgaoEntidade']) {
  return prisma.orgao.upsert({
    where: { cnpj: orgao.cnpj },
    create: {
      cnpj: orgao.cnpj,
      razaoSocial: orgao.razaoSocial,
      esfera: orgao.esferaId === 1 ? 'FEDERAL' : orgao.esferaId === 2 ? 'ESTADUAL' : 'MUNICIPAL',
      poder: 'EXECUTIVO',  // simplificado — PNCP não expõe sempre
      uf: orgao.uf ?? 'DF',
      municipio: orgao.municipio,
      uasg: orgao.codigoUasg,
    },
    update: {
      razaoSocial: orgao.razaoSocial,
      municipio: orgao.municipio,
    },
  })
}

async function upsertLicitacao(item: PncpContratacao, orgaoId: string) {
  const codigoExterno = item.numeroControlePNCP

  return prisma.licitacao.upsert({
    where: { portalOrigem_codigoExterno: { portalOrigem: Portal.PNCP, codigoExterno } },
    create: {
      numeroEdital: item.numeroCompra,
      titulo: item.objetoCompra.substring(0, 255),
      objeto: item.objetoCompra,
      modalidade: MODALIDADE_MAP[item.modalidadeId] ?? Modalidade.OUTROS,
      situacao: SITUACAO_MAP[item.situacaoCompraId] ?? Situacao.ABERTA,
      valorEstimado: item.valorTotalEstimado ?? null,
      valorHomologado: item.valorTotalHomologado ?? null,
      dataPublicacao: new Date(item.dataPublicacaoPncp),
      dataAbertura: item.dataAberturaProposta
        ? new Date(item.dataAberturaProposta)
        : new Date(item.dataPublicacaoPncp),
      dataEncerramento: item.dataEncerramentoProposta
        ? new Date(item.dataEncerramentoProposta)
        : null,
      linkEdital: item.linkSistemaOrigem ?? `https://pncp.gov.br/app/editais/${codigoExterno}`,
      portalOrigem: Portal.PNCP,
      codigoExterno,
      anoCompra: item.anoCompra,
      uf: item.orgaoEntidade.uf ?? 'DF',
      municipio: item.orgaoEntidade.municipio,
      orgaoId,
    },
    update: {
      situacao: SITUACAO_MAP[item.situacaoCompraId] ?? Situacao.ABERTA,
      valorHomologado: item.valorTotalHomologado ?? null,
      dataEncerramento: item.dataEncerramentoProposta
        ? new Date(item.dataEncerramentoProposta)
        : null,
      updatedAt: new Date(),
    },
  })
}

export async function coletarPNCP(options: {
  dataInicio: string  // YYYYMMDD
  dataFim: string
  pagina?: number
}): Promise<{ total: number; novos: number; atualizados: number; erros: number }> {
  const stats = { total: 0, novos: 0, atualizados: 0, erros: 0 }

  let pagina = options.pagina ?? 1
  let totalPaginas = 1

  console.log(`[PNCP] Iniciando coleta: ${options.dataInicio} → ${options.dataFim}`)

  do {
    const resp = await fetchPncp('/contratacoes/publicacao', {
      dataInicial: options.dataInicio,
      dataFinal: options.dataFim,
      pagina: String(pagina),
      tamanhoPagina: '50',
      codigoModalidadeContratacao: '8',
    })

    totalPaginas = resp.totalPaginas
    stats.total += resp.data.length

    for (const item of resp.data) {
      try {
        const orgao = await upsertOrgao(item.orgaoEntidade)
        const existing = await prisma.licitacao.findUnique({
          where: {
            portalOrigem_codigoExterno: {
              portalOrigem: Portal.PNCP,
              codigoExterno: item.numeroControlePNCP,
            },
          },
          select: { id: true },
        })

        const licitacao = await upsertLicitacao(item, orgao.id)
        const isNova = !existing

        // Indexa no ElasticSearch de forma assíncrona
        indexarLicitacao(licitacao.id).catch((err) =>
          console.error(`[PNCP] Erro ao indexar ${licitacao.id}:`, err)
        )

        // Dispara alertas apenas para licitações novas
        if (isNova) {
          dispararAlertas(licitacao.id)
        }

        existing ? stats.atualizados++ : stats.novos++
      } catch (err) {
        stats.erros++
        console.error(`[PNCP] Erro ao processar ${item.numeroControlePNCP}:`, err)
      }
    }

    console.log(`[PNCP] Página ${pagina}/${totalPaginas} — ${stats.novos} novos, ${stats.atualizados} atualizados`)
    pagina++
  } while (pagina <= totalPaginas)

  return stats
}
