// apps/scraper/src/queue/index.ts
import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { coletarPNCP }                    from '../collectors/pncp.js'
import { coletarBLL }                     from '../collectors/bll.js'
import { coletarBNC }                     from '../collectors/bnc.js'
import { coletarComprasnet }              from '../collectors/comprasnet.js'
import { coletarLicitacoesE }             from '../collectors/licitacoes-e.js'
import { coletarLicitaNet }               from '../collectors/licitanet.js'
import { coletarPortalComprasPublicas }   from '../collectors/portal-compras-publicas.js'
import { coletarLicitarDigital }          from '../collectors/licitardigital.js'
import { coletarBbmNet }                  from '../collectors/bbmnet.js'
import { coletarNegociosPublicos }         from '../collectors/negocios-publicos.js'
import { coletarSolLicitacoes }            from '../collectors/sol-licitacoes.js'
import { coletarEquiplano }                from '../collectors/equiplano.js'
import { coletarCitacon }                  from '../collectors/citacon.js'
import { coletarLicitacon }                from '../collectors/licitacon.js'
import { prisma } from '@licitabr/database'

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

export type ScraperJobData =
  | { portal: 'PNCP';                   dataInicio: string; dataFim: string }
  | { portal: 'BLL';                    paginas?: number; uf?: string }
  | { portal: 'BNC';                    paginas?: number; uf?: string }
  | { portal: 'COMPRASNET';             paginas?: number; uf?: string; dias?: number }
  | { portal: 'LICITACOES_E';           paginas?: number; uf?: string }
  | { portal: 'LICITANET';              paginas?: number; uf?: string }
  | { portal: 'PORTAL_COMPRAS_PUBLICAS';paginas?: number; uf?: string }
  | { portal: 'LICITARDIGITAL';         paginas?: number; uf?: string }
  | { portal: 'BBMNET';                 paginas?: number; uf?: string }
  | { portal: 'NEGOCIOS_PUBLICOS';      paginas?: number; uf?: string }
  | { portal: 'SOL_LICITACOES';         paginas?: number; uf?: string }
  | { portal: 'EQUIPLANO';              paginas?: number; uf?: string }
  | { portal: 'CITACON';                paginas?: number; uf?: string }
  | { portal: 'LICITACON';              paginas?: number; uf?: string }

export const scraperQueue = new Queue<ScraperJobData>('scrapers', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 60_000 },
    removeOnComplete: { count: 200 },
    removeOnFail:     { count: 500 },
  },
})

// ── Agendamentos ────────────────────────────────────────
export async function iniciarAgendamentos() {
  const hoje  = new Date()
  const ontem = new Date(hoje.getTime() - 86_400_000)
  const fmt   = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

  // PNCP — API oficial, alta confiabilidade: a cada 2h
  await scraperQueue.add('pncp-incremental',
    { portal: 'PNCP', dataInicio: fmt(ontem), dataFim: fmt(hoje) },
    { repeat: { pattern: '0 */2 * * *' } })

  // BLL — Playwright: 06h e 14h (delay por ser browser)
  await scraperQueue.add('bll-manha',
    { portal: 'BLL', paginas: 10 },
    { repeat: { pattern: '0 6 * * *' } })
  await scraperQueue.add('bll-tarde',
    { portal: 'BLL', paginas: 5 },
    { repeat: { pattern: '0 14 * * *' } })

  // BNC — API JSON: 07h
  await scraperQueue.add('bnc-diario',
    { portal: 'BNC', paginas: 10 },
    { repeat: { pattern: '0 7 * * *' } })

  // Comprasnet — maior portal federal: 08h e 20h
  await scraperQueue.add('comprasnet-manha',
    { portal: 'COMPRASNET', paginas: 10, dias: 7 },
    { repeat: { pattern: '0 8 * * *' } })
  await scraperQueue.add('comprasnet-noite',
    { portal: 'COMPRASNET', paginas: 5, dias: 2 },
    { repeat: { pattern: '0 20 * * *' } })

  // Licitações-e (Banco do Brasil): 09h
  await scraperQueue.add('licitacoes-e-diario',
    { portal: 'LICITACOES_E', paginas: 10 },
    { repeat: { pattern: '0 9 * * *' } })

  // LicitaNet — Playwright: 10h
  await scraperQueue.add('licitanet-diario',
    { portal: 'LICITANET', paginas: 5 },
    { repeat: { pattern: '0 10 * * *' } })

  // Portal Compras Públicas: 11h
  await scraperQueue.add('pcp-diario',
    { portal: 'PORTAL_COMPRAS_PUBLICAS', paginas: 10 },
    { repeat: { pattern: '0 11 * * *' } })

  // LicitarDigital: 12h
  await scraperQueue.add('licitardigital-diario',
    { portal: 'LICITARDIGITAL', paginas: 10 },
    { repeat: { pattern: '0 12 * * *' } })

  // BbmNet: 13h
  await scraperQueue.add('bbmnet-diario',
    { portal: 'BBMNET', paginas: 10 },
    { repeat: { pattern: '0 13 * * *' } })

  // Negócios Públicos: 15h
  await scraperQueue.add('negocios-publicos-diario',
    { portal: 'NEGOCIOS_PUBLICOS', paginas: 10 },
    { repeat: { pattern: '0 15 * * *' } })

  // Sol Licitações (SC/RS/PR): 16h
  await scraperQueue.add('sol-licitacoes-diario',
    { portal: 'SOL_LICITACOES', paginas: 8 },
    { repeat: { pattern: '0 16 * * *' } })

  // Equiplano (municípios SP): 17h
  await scraperQueue.add('equiplano-diario',
    { portal: 'EQUIPLANO', paginas: 8, uf: 'SP' },
    { repeat: { pattern: '0 17 * * *' } })

  // Citacon (RS): 18h
  await scraperQueue.add('citacon-diario',
    { portal: 'CITACON', paginas: 6, uf: 'RS' },
    { repeat: { pattern: '0 18 * * *' } })

  // LicitaCon (câmaras SP): 19h
  await scraperQueue.add('licitacon-diario',
    { portal: 'LICITACON', paginas: 6, uf: 'SP' },
    { repeat: { pattern: '0 19 * * *' } })

  console.log('[Queue] 14 portais agendados: PNCP(*/2h) BLL BNC Comprasnet Licitações-e LicitaNet PCP LicitarDigital BbmNet NegóciosPúblicos Sol Equiplano Citacon LicitaCon')
}

// ── Worker ──────────────────────────────────────────────
export const scraperWorker = new Worker<ScraperJobData>(
  'scrapers',
  async (job) => {
    const logId  = await prisma.scraperLog.create({
      data: { portal: job.data.portal as any, status: 'INICIADO' },
    })
    const inicio = Date.now()

    try {
      let stats = { total: 0, novos: 0, atualizados: 0, erros: 0 }

      switch (job.data.portal) {
        case 'PNCP':
          stats = await coletarPNCP({ dataInicio: job.data.dataInicio, dataFim: job.data.dataFim })
          break
        case 'BLL':
          stats = await coletarBLL({ paginas: job.data.paginas, uf: job.data.uf, headless: true })
          break
        case 'BNC':
          stats = await coletarBNC({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'COMPRASNET':
          stats = await coletarComprasnet({ paginas: job.data.paginas, uf: job.data.uf, dias: job.data.dias })
          break
        case 'LICITACOES_E':
          stats = await coletarLicitacoesE({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'LICITANET':
          stats = await coletarLicitaNet({ paginas: job.data.paginas, uf: job.data.uf, headless: true })
          break
        case 'PORTAL_COMPRAS_PUBLICAS':
          stats = await coletarPortalComprasPublicas({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'LICITARDIGITAL':
          stats = await coletarLicitarDigital({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'BBMNET':
          stats = await coletarBbmNet({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'NEGOCIOS_PUBLICOS':
          stats = await coletarNegociosPublicos({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'SOL_LICITACOES':
          stats = await coletarSolLicitacoes({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'EQUIPLANO':
          stats = await coletarEquiplano({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'CITACON':
          stats = await coletarCitacon({ paginas: job.data.paginas, uf: job.data.uf })
          break
        case 'LICITACON':
          stats = await coletarLicitacon({ paginas: job.data.paginas, uf: job.data.uf })
          break
      }

      await prisma.scraperLog.update({
        where: { id: logId.id },
        data: {
          status:           stats.erros > 0 && stats.novos === 0 ? 'FALHOU' : stats.erros > 0 ? 'PARCIAL' : 'CONCLUIDO',
          totalColetados:   stats.total,
          totalNovos:       stats.novos,
          totalAtualizados: stats.atualizados,
          totalErros:       stats.erros,
          duracao:          Math.round((Date.now() - inicio) / 1000),
          finalizadoEm:     new Date(),
        },
      })

      return stats
    } catch (err) {
      await prisma.scraperLog.update({
        where: { id: logId.id },
        data: { status: 'FALHOU', erro: String(err), duracao: Math.round((Date.now() - inicio) / 1000), finalizadoEm: new Date() },
      })
      throw err
    }
  },
  {
    connection,
    concurrency: 2, // BLL e LicitaNet usam browser — manter baixo
  }
)

scraperWorker.on('completed', (job, result) => console.log(`[Worker] ${job.name}:`, result))
scraperWorker.on('failed',    (job, err)    => console.error(`[Worker] ${job?.name} falhou:`, err.message))
