// apps/scraper/src/main.ts
import { scraperWorker, iniciarAgendamentos } from './queue/index.js'
import { prisma } from '@licitabr/database'

async function main() {
  console.log('🤖 LicitaBR Scraper iniciando…')
  console.log(`   Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   Redis:    ${process.env.REDIS_URL ?? 'redis://localhost:6379'}`)

  // Testa conexão com o banco
  await prisma.$queryRaw`SELECT 1`
  console.log('   Postgres: conectado ✓')

  // Registra cron jobs
  await iniciarAgendamentos()
  console.log('   Agendamentos registrados ✓')

  // Graceful shutdown
  async function shutdown(signal: string) {
    console.log(`\n[Scraper] ${signal} recebido — encerrando…`)
    await scraperWorker.close()
    await prisma.$disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))

  console.log('\n✅ Scraper rodando. Aguardando jobs…\n')
}

main().catch((err) => {
  console.error('[Scraper] Erro fatal:', err)
  process.exit(1)
})
