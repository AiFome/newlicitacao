// apps/scraper/src/collectors/licitanet.ts
//
// LicitaNet (https://www.licitanet.com.br) é um portal privado de licitações
// com foco em municípios do interior. Sem API pública — coleta via Playwright.

import { chromium, type Browser, type Page } from 'playwright'
import { prisma, Portal, Modalidade, Situacao, Esfera, Poder } from '@licitabr/database'
import { indexarLicitacao } from '../services/indexer.js'

const MODALIDADE_MAP: Record<string, Modalidade> = {
  'pregão eletrônico':  Modalidade.PREGAO_ELETRONICO,
  'pregão presencial':  Modalidade.PREGAO_PRESENCIAL,
  'concorrência':       Modalidade.CONCORRENCIA,
  'tomada de preços':   Modalidade.TOMADA_DE_PRECOS,
  'convite':            Modalidade.CONVITE,
  'leilão':             Modalidade.LEILAO,
  'dispensa':           Modalidade.DISPENSA,
  'inexigibilidade':    Modalidade.INEXIGIBILIDADE,
  'credenciamento':     Modalidade.CREDENCIAMENTO,
}

function normalizarModalidade(texto: string): Modalidade {
  const lower = texto.toLowerCase().trim()
  for (const [k, v] of Object.entries(MODALIDADE_MAP)) {
    if (lower.includes(k)) return v
  }
  return Modalidade.PREGAO_ELETRONICO
}

function parseValor(texto: string): number | null {
  if (!texto || texto === '-' || texto.toLowerCase().includes('sigiloso')) return null
  const n = parseFloat(texto.replace(/[R$\s.]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

function parseData(texto: string): Date | null {
  if (!texto || texto === '-') return null
  const [datePart, timePart] = texto.trim().split(' ')
  if (!datePart) return null
  const [d, m, y] = (datePart as string).split('/').map(Number)
  if (!d || !m || !y) return null
  const [h = 0, min = 0] = (timePart ?? '').split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

async function extrairDaPagina(page: Page) {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table.resultado-licitacoes tbody tr, table tbody tr'))
    return rows.map((row) => {
      const cols = Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim() ?? '')
      const link = (row.querySelector('a[href]') as HTMLAnchorElement)?.href ?? ''
      return { cols, link }
    }).filter((r) => r.cols.length >= 4 && r.cols.some(c => c.length > 0))
  })
}

async function upsertOrgao(nome: string, uf: string, municipio: string) {
  const chave = `LNET:${nome.substring(0, 60).trim()}:${uf}`
  return prisma.orgao.upsert({
    where:  { cnpj: chave },
    create: {
      cnpj:        chave,
      razaoSocial: nome.trim(),
      esfera:      Esfera.MUNICIPAL,
      poder:       Poder.EXECUTIVO,
      uf:          uf.trim().toUpperCase().substring(0, 2),
      municipio:   municipio.trim() || null,
    },
    update: { razaoSocial: nome.trim() },
  })
}

export interface LicitaNetStats {
  total: number; novos: number; atualizados: number; erros: number
}

export async function coletarLicitaNet(opts: {
  paginas?:  number
  uf?:       string
  headless?: boolean
}): Promise<LicitaNetStats> {
  const stats: LicitaNetStats = { total: 0, novos: 0, atualizados: 0, erros: 0 }
  const maxPaginas = opts.paginas ?? 5
  const headless   = opts.headless ?? true

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })

    const context = await browser.newContext({
      userAgent: process.env.SCRAPER_USER_AGENT ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      locale:    'pt-BR',
      viewport:  { width: 1280, height: 800 },
    })

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
    })

    const page = await context.newPage()
    console.log('[LicitaNet] Navegando para o portal…')

    for (let p = 1; p <= maxPaginas; p++) {
      try {
        const ufParam = opts.uf ? `&uf=${opts.uf}` : ''
        const url = `https://www.licitanet.com.br/licitacoes/abertas?pagina=${p}${ufParam}`

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
        await page.waitForTimeout(1_500)

        const captcha = await page.$('[class*="captcha"], #captcha, .g-recaptcha')
        if (captcha) {
          console.warn(`[LicitaNet] Captcha detectado na página ${p} — parando`)
          break
        }

        const items = await extrairDaPagina(page)
        if (!items.length) {
          console.log(`[LicitaNet] Página ${p} sem dados — fim`)
          break
        }

        stats.total += items.length
        console.log(`[LicitaNet] Página ${p}: ${items.length} itens`)

        for (const { cols, link } of items) {
          try {
            // Colunas típicas LicitaNet: código | modalidade | órgão | município/UF | objeto | valor | data
            const codigo    = cols[0] ?? ''
            const modalTxt  = cols[1] ?? ''
            const orgaoNome = cols[2] ?? 'Órgão LicitaNet'
            const locTxt    = cols[3] ?? ''
            const objeto    = cols[4] ?? cols[2] ?? ''
            const valorTxt  = cols[5] ?? ''
            const dataTxt   = cols[6] ?? cols[5] ?? ''

            if (!codigo && !objeto) { stats.erros++; continue }

            // Extrair UF e município de "Município/UF" ou "UF"
            const locParts   = locTxt.split('/')
            const municipio  = locParts[0]?.trim() ?? ''
            const uf         = (locParts[1] ?? locTxt).trim().toUpperCase().substring(0, 2) || 'BR'

            const orgao        = await upsertOrgao(orgaoNome, uf, municipio)
            const codigoExterno = `LNET:${codigo || objeto.substring(0, 20)}`
            const dataAbertura  = parseData(dataTxt) ?? new Date()

            const existing = await prisma.licitacao.findUnique({
              where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITANET, codigoExterno } },
              select: { id: true },
            })

            const licitacao = await prisma.licitacao.upsert({
              where:  { portalOrigem_codigoExterno: { portalOrigem: Portal.LICITANET, codigoExterno } },
              create: {
                numeroEdital:  codigo || codigoExterno,
                titulo:        objeto.substring(0, 255),
                objeto,
                modalidade:    normalizarModalidade(modalTxt),
                situacao:      Situacao.ABERTA,
                valorEstimado: parseValor(valorTxt),
                dataPublicacao:dataAbertura,
                dataAbertura,
                linkEdital:    link || `https://www.licitanet.com.br/licitacoes/${codigo}`,
                portalOrigem:  Portal.LICITANET,
                codigoExterno,
                anoCompra:     dataAbertura.getFullYear(),
                uf,
                municipio:     municipio || null,
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
            console.error(`[LicitaNet] Erro item:`, err)
          }
        }

        await page.waitForTimeout(2000 + Math.random() * 2000)
      } catch (err) {
        console.error(`[LicitaNet] Erro página ${p}:`, err)
        stats.erros++
        break
      }
    }

    await context.close()
  } finally {
    await browser?.close()
  }

  console.log(`[LicitaNet] ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.erros} erros`)
  return stats
}
