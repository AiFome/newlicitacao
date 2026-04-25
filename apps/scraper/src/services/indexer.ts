// apps/scraper/src/services/indexer.ts
import { Client } from '@elastic/elasticsearch'
import { prisma } from '@licitabr/database'

const client = new Client({
  node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
})

const INDEX = process.env.ELASTICSEARCH_INDEX_LICITACOES ?? 'licitacoes'

/**
 * Indexa uma única licitação no ElasticSearch.
 * Usa upsert (index com id) — idempotente.
 */
export async function indexarLicitacao(licitacaoId: string): Promise<void> {
  const lic = await prisma.licitacao.findUnique({
    where:   { id: licitacaoId },
    include: { orgao: { select: { id: true, razaoSocial: true, cnpj: true, esfera: true } } },
  })

  if (!lic) return

  await client.index({
    index: INDEX,
    id:    lic.id,
    document: {
      id:             lic.id,
      titulo:         lic.titulo,
      objeto:         lic.objeto,
      modalidade:     lic.modalidade,
      situacao:       lic.situacao,
      portalOrigem:   lic.portalOrigem,
      uf:             lic.uf,
      municipio:      lic.municipio,
      valorEstimado:  lic.valorEstimado ? Number(lic.valorEstimado) : null,
      dataPublicacao: lic.dataPublicacao.toISOString(),
      dataAbertura:   lic.dataAbertura.toISOString(),
      dataEncerramento: lic.dataEncerramento?.toISOString() ?? null,
      orgao: {
        id:          lic.orgao.id,
        razaoSocial: lic.orgao.razaoSocial,
        cnpj:        lic.orgao.cnpj,
        esfera:      lic.orgao.esfera,
      },
    },
  })

  // Marca como indexado no Postgres
  await prisma.licitacao.update({
    where: { id: licitacaoId },
    data:  { indexadoEm: new Date() },
  })
}

/**
 * Indexa em lote — usado para reindexação completa ou pós-migration.
 * Processa em chunks de 100 para não sobrecarregar o ES.
 */
export async function indexarEmLote(opts: {
  portalOrigem?: string
  apenasNaoIndexados?: boolean
  limite?: number
}): Promise<{ indexados: number; erros: number }> {
  const stats = { indexados: 0, erros: 0 }
  const CHUNK = 100

  const where: Record<string, unknown> = {}
  if (opts.portalOrigem)      where.portalOrigem = opts.portalOrigem
  if (opts.apenasNaoIndexados) where.indexadoEm  = null

  const total = await prisma.licitacao.count({ where })
  const paginas = Math.ceil((opts.limite ?? total) / CHUNK)

  console.log(`[Indexer] ${total} licitações para indexar em ${paginas} chunk(s)`)

  for (let i = 0; i < paginas; i++) {
    const licitacoes = await prisma.licitacao.findMany({
      where,
      skip:    i * CHUNK,
      take:    CHUNK,
      include: { orgao: { select: { id: true, razaoSocial: true, cnpj: true, esfera: true } } },
    })

    if (!licitacoes.length) break

    // Bulk indexing
    const operations = licitacoes.flatMap((lic) => [
      { index: { _index: INDEX, _id: lic.id } },
      {
        id:             lic.id,
        titulo:         lic.titulo,
        objeto:         lic.objeto,
        modalidade:     lic.modalidade,
        situacao:       lic.situacao,
        portalOrigem:   lic.portalOrigem,
        uf:             lic.uf,
        municipio:      lic.municipio,
        valorEstimado:  lic.valorEstimado ? Number(lic.valorEstimado) : null,
        dataPublicacao: lic.dataPublicacao.toISOString(),
        dataAbertura:   lic.dataAbertura.toISOString(),
        dataEncerramento: lic.dataEncerramento?.toISOString() ?? null,
        orgao: {
          id:          lic.orgao.id,
          razaoSocial: lic.orgao.razaoSocial,
          cnpj:        lic.orgao.cnpj,
          esfera:      lic.orgao.esfera,
        },
      },
    ])

    try {
      const resp = await client.bulk({ operations })

      if (resp.errors) {
        const erros = resp.items.filter((item) => item.index?.error)
        stats.erros += erros.length
        stats.indexados += licitacoes.length - erros.length
        console.error(`[Indexer] ${erros.length} erro(s) no chunk ${i + 1}`)
      } else {
        stats.indexados += licitacoes.length
      }

      // Atualiza indexadoEm em lote
      await prisma.licitacao.updateMany({
        where: { id: { in: licitacoes.map((l) => l.id) } },
        data:  { indexadoEm: new Date() },
      })
    } catch (err) {
      stats.erros += licitacoes.length
      console.error(`[Indexer] Erro no chunk ${i + 1}:`, err)
    }

    console.log(`[Indexer] Chunk ${i + 1}/${paginas}: ${stats.indexados} indexados, ${stats.erros} erros`)
  }

  return stats
}

/**
 * Remove uma licitação do índice (ex: quando anulada/revogada).
 */
export async function removerDoIndice(licitacaoId: string): Promise<void> {
  try {
    await client.delete({ index: INDEX, id: licitacaoId })
  } catch {
    // Ignora se não existir no índice
  }
}
