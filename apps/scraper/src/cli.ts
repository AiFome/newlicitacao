#!/usr/bin/env node
// apps/scraper/src/cli.ts
// Uso:
//   npx tsx cli.ts --portal=PNCP --dias=7
//   npx tsx cli.ts --portal=BLL --paginas=5
//   npx tsx cli.ts --portal=BNC --paginas=10
//   npx tsx cli.ts --portal=COMPRASNET --paginas=5
//   npx tsx cli.ts --portal=LICITACOES_E --paginas=5
//   npx tsx cli.ts --portal=LICITANET --paginas=3
//   npx tsx cli.ts --portal=PORTAL_COMPRAS_PUBLICAS --paginas=5
//   npx tsx cli.ts --portal=LICITARDIGITAL --paginas=5
//   npx tsx cli.ts --portal=BBMNET --paginas=5
//   npx tsx cli.ts --portal=NEGOCIOS_PUBLICOS --paginas=5
//   npx tsx cli.ts --portal=SOL_LICITACOES --paginas=5
//   npx tsx cli.ts --portal=EQUIPLANO --paginas=5
//   npx tsx cli.ts --portal=CITACON --paginas=5
//   npx tsx cli.ts --portal=LICITACON --paginas=5
//   npx tsx cli.ts --portal=BLL --uf=SP   (filtrar por UF)
//   npx tsx cli.ts --reindex               (reindexar tudo no ES)
//   npx tsx cli.ts --reindex --pendentes   (só não indexadas)

import { coletarPNCP }                    from './collectors/pncp.js'
import { coletarBLL }                     from './collectors/bll.js'
import { coletarBNC }                     from './collectors/bnc.js'
import { coletarComprasnet }              from './collectors/comprasnet.js'
import { coletarLicitacoesE }             from './collectors/licitacoes-e.js'
import { coletarLicitaNet }               from './collectors/licitanet.js'
import { coletarPortalComprasPublicas }   from './collectors/portal-compras-publicas.js'
import { coletarLicitarDigital }          from './collectors/licitardigital.js'
import { coletarBbmNet }                  from './collectors/bbmnet.js'
import { coletarNegociosPublicos }         from './collectors/negocios-publicos.js'
import { coletarSolLicitacoes }            from './collectors/sol-licitacoes.js'
import { coletarEquiplano }                from './collectors/equiplano.js'
import { coletarCitacon }                  from './collectors/citacon.js'
import { coletarLicitacon }                from './collectors/licitacon.js'
import { indexarEmLote }                  from './services/indexer.js'
import { prisma }                         from '@licitabr/database'

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => { const [k, v] = a.slice(2).split('='); return [k!, v ?? 'true'] })
)

const portal    = (args['portal']  ?? 'PNCP').toUpperCase()
const dias      = Number(args['dias']    ?? 1)
const paginas   = Number(args['paginas'] ?? 5)
const uf        = args['uf']
const reindex   = args['reindex']   === 'true'
const pendentes = args['pendentes'] === 'true'

const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

async function main() {
  console.log(`\n🚀 LicitaBR CLI — ${reindex ? 'Reindexação ES' : `Coleta ${portal}`}`)

  if (reindex) {
    console.log(`   Modo : ${pendentes ? 'Apenas não indexadas' : 'Todas'}\n`)
    const stats = await indexarEmLote({
      portalOrigem:       args['portal'] ? portal : undefined,
      apenasNaoIndexados: pendentes,
    })
    console.log(`\n✅ ${stats.indexados} indexadas, ${stats.erros} erros`)
    await prisma.$disconnect()
    return
  }

  let stats = { total: 0, novos: 0, atualizados: 0, erros: 0 }

  switch (portal) {
    case 'PNCP': {
      const fim    = new Date()
      const inicio = new Date(fim.getTime() - dias * 86_400_000)
      console.log(`   Período: últimos ${dias} dia(s)\n`)
      stats = await coletarPNCP({ dataInicio: fmt(inicio), dataFim: fmt(fim) })
      break
    }
    case 'BLL':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarBLL({ paginas, uf, headless: true })
      break
    case 'BNC':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarBNC({ paginas, uf })
      break
    case 'COMPRASNET':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarComprasnet({ paginas, uf, dias })
      break
    case 'LICITACOES_E':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarLicitacoesE({ paginas, uf })
      break
    case 'LICITANET':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarLicitaNet({ paginas, uf, headless: true })
      break
    case 'PORTAL_COMPRAS_PUBLICAS':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarPortalComprasPublicas({ paginas, uf })
      break
    case 'LICITARDIGITAL':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarLicitarDigital({ paginas, uf })
      break
    case 'BBMNET':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarBbmNet({ paginas, uf })
      break
    case 'NEGOCIOS_PUBLICOS':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarNegociosPublicos({ paginas, uf })
      break
    case 'SOL_LICITACOES':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarSolLicitacoes({ paginas, uf })
      break
    case 'EQUIPLANO':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarEquiplano({ paginas, uf })
      break
    case 'CITACON':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarCitacon({ paginas, uf })
      break
    case 'LICITACON':
      console.log(`   Páginas: ${paginas}${uf ? ` | UF: ${uf}` : ''}\n`)
      stats = await coletarLicitacon({ paginas, uf })
      break
    default:
      console.error(`\n❌ Portal '${portal}' não reconhecido.`)
      console.error('   Use: PNCP | BLL | BNC | COMPRASNET | LICITACOES_E | LICITANET | PORTAL_COMPRAS_PUBLICAS | LICITARDIGITAL | BBMNET | NEGOCIOS_PUBLICOS | SOL_LICITACOES | EQUIPLANO | CITACON | LICITACON\n')
      process.exit(1)
  }

  console.log(`\n✅ ${portal}: ${stats.novos} novos, ${stats.atualizados} atualizados, ${stats.total} total, ${stats.erros} erros`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error('Erro fatal:', err); process.exit(1) })
