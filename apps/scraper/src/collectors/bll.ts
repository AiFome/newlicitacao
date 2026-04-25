// apps/scraper/src/collectors/bll.ts
//
// A BLL (https://www.bll.org.br) não tem API pública.
// Usamos Playwright para navegar nas páginas de licitações abertas,
// extrair os dados do HTML e normalizar para o schema do LicitaBR.

import { chromium, type Browser, type Page } from 'playwright'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

// ── Mapeamentos ─────────────────────────────────────────────
const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregão eletrônico':       Modalidade.PREGAO_ELETRONICO,
  'pregão presencial':       Modalidade.PREGAO_PRESENCIAL,
  'concorrência':            Modalidade.CONCORRENCIA,
  'concorrência eletrônica': Modalidade.CONCORRENCIA,
  'tomada de preços':        Modalidade.TOMADA_DE_PRECOS,
  'convite':                 Modalidade.CONVITE,
  'leilão':                  Modalidade.LEILAO,
  'concurso':                Modalidade.CONCURSO,
  'dispensa':                Modalidade.DISPENSA,
  'inexigibilidade':         Modalidade.INEXIGIBILIDADE,
  'rdc':                     Modalidade.RDC,
  'credenciamento':          Modalidade.CREDENCIAMENTO,
}

function normalizarModalidade(texto: string): Modalidade {
  const lower = texto.toLowerCase().trim()
  for (const [key, val] of Object.entries(MODALIDADE_MAP)) {
    if (lower.includes(key)) return val
  }
  return Modalidade.PREGAO_ELETRONICO // default
}

function parseValor(texto: string): number | null {
  if (!texto || texto === '-' || texto.toLowerCase().includes('sigiloso')) return null
  const limpo = texto.replace(/[R$\s.]/g, '').replace(',', '.')
  const val   = parseFloat(limpo)
  return isNaN(val) ? null : val
}

function parseData(texto: string): Date | null {
  if (!texto || texto === '-') return null
  // Formatos aceitos: DD/MM/YYYY HH:mm ou DD/MM/YYYY
  const [datePart, timePart] = texto.trim().split(' ')
  if (!datePart) return null
  const [dia, mes, ano] = datePart.split('/').map(Number)
  if (!dia || !mes || !ano) return null
  const [hora = 0, min = 0] = (timePart ?? '00:00').split(':').map(Number)
  return new Date(ano, mes - 1, dia, hora, min)
}

// ── Extração de uma linha da tabela ───────────────────────
interface BllLicitacao {
  numeroEdital:   string
  objeto:         string
  modalidade:     string
  orgaoNome:      string
  uf:             string
  municipio:      string
  valorEstimado:  string
  dataAbertura:   string
  linkEdital:     string
  codigoExterno:  string
}

async function extrairLicitacoesDaPagina(page: Page): Promise<BllLicitacao[]> {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'))
    return rows.map((row) => {
      const cols = Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '')
      const link = row.querySelector('a[href]') as HTMLAnchorElement | null

      return {
        codigoExterno: cols[0] ?? '',
        numeroEdital:  cols[1] ?? cols[0] ?? '',
        modalidade:    cols[2] ?? '',
        orgaoNome:     cols[3] ?? '',
        municipio:     cols[4] ?? '',
        uf:            cols[5] ?? '',
        objeto:        cols[6] ?? '',
        valorEstimado: cols[7] ?? '',
        dataAbertura:  cols[8] ?? '',
        linkEdital:    link?.href ?? '',
      }
    }).filter((l) => l.codigoExterno && l.objeto)
  })
}

// ── Upsert de órgão ─────────────────────────────────────────
async function upsertOrgaoBll(nome: string, uf: string, municipio: string) {
  // BLL não expõe CNPJ na listagem — usamos nome + UF como identificador
  const chave = `BLL:${nome.substring(0, 50).trim()}:${uf}`

  return prisma.orgao.upsert({
    where:  { cnpj: chave },   // campo CNPJ usado como chave composta BLL
    create: {
      cnpj:        chave,
      razaoSocial: nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2),
      municipio:   municipio.trim(),
    },
    update: { razaoSocial: nome.trim() },
  })
}

// ── Coleta principal ────────────────────────────────────────
export interface BllStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarBLL(opts: {
  paginas?:     number   // quantas páginas coletar (default: 5 — ~250 editais)
  uf?:          string   // filtrar por UF
  headless?:    boolean
}): Promise<BllStats> {
  const stats: BllStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 5
  const headless   = opts.headless ?? (process.env.SCRAPER_HEADLESS !== 'false')

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const context = await browser.newContext({
      userAgent: process.env.SCRAPER_USER_AGENT ??
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale:    'pt-BR',
      viewport:  { width: 1280, height: 800 },
    })

    const page = await context.newPage()

    // Anti-bot: desabilita webdriver flag
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })

    console.log('[BLL] Navegando para a listagem de licitações…')

    for (let p = 1; p <= maxPaginas; p++) {
      try {
        // URL de busca da BLL — licitações abertas ordenadas por data de abertura
        const ufParam = opts.uf ? `&uf=${opts.uf}` : ''
        const url = `https://www.bll.org.br/licitacao/busca/?status=1&pag=${p}${ufParam}`

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
        await page.waitForTimeout(1_500) // delay humano

        // Verifica se chegou ao captcha
        const captcha = await page.$('[class*="captcha"], #captcha')
        if (captcha) {
          console.warn(`[BLL] Captcha detectado na página ${p} — parando coleta`)
          break
        }

        const licitacoes = await extrairLicitacoesDaPagina(page)

        if (!licitacoes.length) {
          console.log(`[BLL] Página ${p} vazia — fim da coleta`)
          break
        }

        stats.total += licitacoes.length
        console.log(`[BLL] Página ${p}/${maxPaginas}: ${licitacoes.length} licitações extraídas`)

        for (const item of licitacoes) {
          try {
            const uf        = item.uf.trim().toUpperCase().substring(0, 2) || 'BR'
            const orgao     = await upsertOrgaoBll(item.orgaoNome || 'Órgão BLL', uf, item.municipio)
            const dataAb    = parseData(item.dataAbertura)
            const codigoExt = `BLL:${item.codigoExterno}`

            const existing = await prisma.licitacao.findUnique({
              where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.BLL, codigoExterno: codigoExt } },
              select: { id: true },
            })

            const licitacao = await prisma.licitacao.upsert({
              where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.BLL, codigoExterno: codigoExt } },
              create: {
                numeroEdital:   item.numeroEdital || item.codigoExterno,
                titulo:         item.objeto.substring(0, 255),
                objeto:         item.objeto,
                modalidade:     normalizarModalidade(item.modalidade),
                situacao:       Situacao.ABERTA,
                valorEstimado:  parseValor(item.valorEstimado),
                dataPublicacao: dataAb ?? new Date(),
                dataAbertura:   dataAb ?? new Date(),
                linkEdital:     item.linkEdital || `https://www.bll.org.br/licitacao/${item.codigoExterno}`,
                portalOrigem:   Portal.BLL,
                codigoExterno:  codigoExt,
                anoCompra:      dataAb?.getFullYear() ?? new Date().getFullYear(),
                uf,
                municipio:      item.municipio.trim() || null,
                orgaoId:        orgao.id,
              },
              update: {
                situacao:      Situacao.ABERTA,
                valorEstimado: parseValor(item.valorEstimado),
                updatedAt:     new Date(),
              },
            })

            // Indexa e dispara alertas apenas para novas
            if (!existing) {
              indexarLicitacao(licitacao.id).catch(() => {})

              const apiBase  = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
              const apiKey   = process.env.INTERNAL_API_KEY ?? ''
              fetch(`${apiBase}/internal/alertas/processar`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'x-internal-key': apiKey },
                body:    JSON.stringify({ licitacaoId: licitacao.id }),
              }).catch(() => {})

              stats.novos++
            } else {
              stats.atualizados++
            }
          } catch (err) {
            stats.erros++
            console.error(`[BLL] Erro ao processar ${item.codigoExterno}:`, err)
          }
        }

        // Delay entre páginas (2-4s aleatório) para não sobrecarregar o servidor
        const delay = 2000 + Math.random() * 2000
        await page.waitForTimeout(delay)

      } catch (err) {
        console.error(`[BLL] Erro na página ${p}:`, err)
        stats.erros++
        break
      }
    }

    await context.close()
  } finally {
    await browser?.close()
  }

  console.log(`[BLL] Coleta finalizada: ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
