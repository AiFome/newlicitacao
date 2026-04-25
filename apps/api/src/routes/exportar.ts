// apps/api/src/routes/exportar.ts
//
// GET /v1/exportar
// Exporta resultados de busca em CSV ou XLSX nativo (exceljs).
// Disponível apenas para planos PROFISSIONAL e ENTERPRISE.
// Limite: 5.000 registros por exportação.

import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import ExcelJS from 'exceljs'
import { prisma } from '@licitabr/database'
import { authenticate, requirePlano } from '../middleware/auth.js'
import { formatDataHoraSimples, formatMoedaCSV } from '../lib/formatCsv.js'

const LIMITE_REGISTROS = 5_000

const buscaSchema = z.object({
  q:               z.string().optional(),
  modalidade:      z.string().optional(),
  portal:          z.string().optional(),
  uf:              z.string().optional(),
  situacao:        z.string().optional(),
  valorMin:        z.coerce.number().optional(),
  valorMax:        z.coerce.number().optional(),
  dataAberturaDe:  z.string().optional(),
  dataAberturaAte: z.string().optional(),
  formato:         z.enum(['csv', 'xlsx']).default('csv'),
})

// ── Cabeçalhos e configuração das colunas ──────────────────
const COLUNAS = [
  { header: 'Nº Edital',        key: 'numeroEdital',    width: 18 },
  { header: 'Título',           key: 'titulo',           width: 50 },
  { header: 'Objeto',           key: 'objeto',           width: 60 },
  { header: 'Modalidade',       key: 'modalidade',       width: 22 },
  { header: 'Situação',         key: 'situacao',         width: 14 },
  { header: 'Portal',           key: 'portal',           width: 14 },
  { header: 'UF',               key: 'uf',               width:  6 },
  { header: 'Município',        key: 'municipio',        width: 20 },
  { header: 'Órgão',            key: 'orgao',            width: 40 },
  { header: 'CNPJ Órgão',       key: 'cnpj',             width: 20 },
  { header: 'Valor Estimado',   key: 'valorEstimado',    width: 18 },
  { header: 'Valor Homologado', key: 'valorHomologado',  width: 18 },
  { header: 'Data Publicação',  key: 'dataPublicacao',   width: 18 },
  { header: 'Data Abertura',    key: 'dataAbertura',     width: 18 },
  { header: 'Data Encerramento',key: 'dataEncerramento', width: 18 },
  { header: 'Link Edital',      key: 'linkEdital',       width: 60 },
]

// ── CSV com BOM UTF-8 ─────────────────────────────────────
function gerarCSV(linhas: Record<string, string | number | null>[]): string {
  if (!linhas.length) return ''
  const cols  = Object.keys(linhas[0]!)
  const esc   = (v: unknown) => {
    const s = String(v ?? '')
    return (s.includes(',') || s.includes('\n') || s.includes('"'))
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '\uFEFF' + [
    cols.join(','),
    ...linhas.map((r) => cols.map((c) => esc(r[c])).join(',')),
  ].join('\r\n')
}

// ── XLSX nativo com exceljs ───────────────────────────────
async function gerarXLSX(
  dados: Record<string, string | number | null>[],
  titulo: string
): Promise<Buffer> {
  const wb  = new ExcelJS.Workbook()
  wb.creator  = 'LicitaBR'
  wb.created  = new Date()
  wb.modified = new Date()

  const ws = wb.addWorksheet('Licitações', {
    views: [{ state: 'frozen', ySplit: 1 }], // congela cabeçalho
  })

  // Definir colunas
  ws.columns = COLUNAS.map((c) => ({
    header: c.header,
    key:    c.key,
    width:  c.width,
  }))

  // Estilizar cabeçalho
  const headerRow = ws.getRow(1)
  headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A4731' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height    = 22

  // Adicionar dados
  dados.forEach((linha, i) => {
    const row = ws.addRow(linha)
    // Linhas alternadas com fundo levemente colorido
    if (i % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FAF5' } }
    }
    // Formatar colunas de valor como número
    const valorEst = row.getCell('valorEstimado')
    const valorHom = row.getCell('valorHomologado')
    if (typeof linha['valorEstimado'] === 'number')  valorEst.numFmt = '"R$"#,##0.00'
    if (typeof linha['valorHomologado'] === 'number') valorHom.numFmt = '"R$"#,##0.00'
    // Link clicável na coluna de edital
    if (linha['linkEdital']) {
      const cell = row.getCell('linkEdital')
      cell.value = { text: String(linha['linkEdital']), hyperlink: String(linha['linkEdital']) }
      cell.font  = { color: { argb: 'FF0066CC' }, underline: true }
    }
  })

  // Borda nas células
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFD0D5DD' } },
        left:   { style: 'thin', color: { argb: 'FFD0D5DD' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
        right:  { style: 'thin', color: { argb: 'FFD0D5DD' } },
      }
      cell.alignment = { vertical: 'middle', wrapText: false }
    })
  })

  // Aba de metadados
  const wsMeta = wb.addWorksheet('Info')
  wsMeta.addRow(['Gerado por', 'LicitaBR'])
  wsMeta.addRow(['Data de geração', new Date().toLocaleString('pt-BR')])
  wsMeta.addRow(['Total de registros', dados.length])
  wsMeta.addRow(['Filtro aplicado', titulo])
  wsMeta.addRow(['Fonte', 'PNCP, BLL, BNC — dados oficiais'])

  return wb.xlsx.writeBuffer() as Promise<Buffer>
}

export const exportarRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', {
    preHandler: [
      authenticate,
      requirePlano('PROFISSIONAL', 'ENTERPRISE'),
    ],
  }, async (req, reply) => {
    const params = buscaSchema.parse(req.query)

    // ── Filtros ────────────────────────────────────────────
    const where: Record<string, unknown> = {}
    if (params.q) {
      where.OR = [
        { titulo: { contains: params.q, mode: 'insensitive' } },
        { objeto: { contains: params.q, mode: 'insensitive' } },
      ]
    }
    if (params.modalidade) where.modalidade  = { in: params.modalidade.split(',') }
    if (params.portal)     where.portalOrigem = { in: params.portal.split(',') }
    if (params.uf)         where.uf           = { in: params.uf.split(',') }
    if (params.situacao)   where.situacao     = { in: params.situacao.split(',') }
    if (params.valorMin !== undefined || params.valorMax !== undefined) {
      where.valorEstimado = {
        ...(params.valorMin !== undefined && { gte: params.valorMin }),
        ...(params.valorMax !== undefined && { lte: params.valorMax }),
      }
    }
    if (params.dataAberturaDe || params.dataAberturaAte) {
      where.dataAbertura = {
        ...(params.dataAberturaDe  && { gte: new Date(params.dataAberturaDe) }),
        ...(params.dataAberturaAte && { lte: new Date(params.dataAberturaAte) }),
      }
    }

    const licitacoes = await prisma.licitacao.findMany({
      where,
      take:    LIMITE_REGISTROS,
      orderBy: { dataAbertura: 'desc' },
      include: { orgao: { select: { razaoSocial: true, cnpj: true } } },
    })

    // ── Formatar dados ─────────────────────────────────────
    const dados = licitacoes.map((l) => ({
      numeroEdital:    l.numeroEdital,
      titulo:          l.titulo,
      objeto:          l.objeto.substring(0, 500),
      modalidade:      l.modalidade.replace(/_/g, ' '),
      situacao:        l.situacao,
      portal:          l.portalOrigem,
      uf:              l.uf,
      municipio:       l.municipio ?? '',
      orgao:           l.orgao.razaoSocial,
      cnpj:            l.orgao.cnpj,
      valorEstimado:   l.valorEstimado  ? Number(l.valorEstimado)  : null,
      valorHomologado: l.valorHomologado ? Number(l.valorHomologado) : null,
      dataPublicacao:  formatDataHoraSimples(l.dataPublicacao),
      dataAbertura:    formatDataHoraSimples(l.dataAbertura),
      dataEncerramento:formatDataHoraSimples(l.dataEncerramento),
      linkEdital:      l.linkEdital,
    }))

    const timestamp   = new Date().toISOString().slice(0, 10)
    const nomeArquivo = `licitabr-${timestamp}`
    const descFiltro  = [params.q, params.uf, params.situacao].filter(Boolean).join(', ') || 'todos'

    reply
      .header('X-Total-Records', String(licitacoes.length))
      .header('X-Max-Records',   String(LIMITE_REGISTROS))

    if (params.formato === 'xlsx') {
      const buffer = await gerarXLSX(dados, descFiltro)
      return reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="${nomeArquivo}.xlsx"`)
        .send(buffer)
    }

    // CSV padrão
    const csv = gerarCSV(dados.map((d) => ({
      ...d,
      valorEstimado:   formatMoedaCSV(d.valorEstimado),
      valorHomologado: formatMoedaCSV(d.valorHomologado),
    })))

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${nomeArquivo}.csv"`)
      .send(csv)
  })
}
