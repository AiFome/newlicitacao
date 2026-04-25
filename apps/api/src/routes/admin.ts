// apps/api/src/routes/admin.ts
//
// Todas as rotas /v1/admin/* exigem Role.ADMIN ou Role.SUPER_ADMIN.
// SUPER_ADMIN pode promover/rebaixar outros admins.
// Admin não pode se auto-rebaixar nem deletar sua própria conta.

import crypto from 'node:crypto'
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '@licitabr/database'

// ── Guard de admin ────────────────────────────────────────
async function requireAdmin(req: any, reply: any) {
  try {
    await req.jwtVerify()
    const payload = (req as any).user as { sub: string; role?: string }
    if (!payload.sub) throw new Error('no sub')

    const usuario = await prisma.usuario.findUnique({
      where:  { id: payload.sub },
      select: { id: true, email: true, nome: true, role: true, ativo: true },
    })

    if (!usuario?.ativo) return reply.status(401).send({ error: 'Conta inativa.' })
    if (usuario.role !== 'ADMIN' && usuario.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito a administradores.' })
    }

    req.adminUser = usuario
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado.' })
  }
}

async function requireSuperAdmin(req: any, reply: any) {
  await requireAdmin(req, reply)
  if (req.adminUser?.role !== 'SUPER_ADMIN') {
    return reply.status(403).send({ error: 'Apenas Super Admins podem executar esta ação.' })
  }
}

export const adminRoutes: FastifyPluginAsync = async (app) => {

  // ── DASHBOARD MÉTRICAS ───────────────────────────────────
  app.get('/dashboard', { preHandler: requireAdmin }, async (_req, reply) => {
    const agora    = new Date()
    const hoje     = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const semana   = new Date(hoje.getTime() - 7  * 86_400_000)
    const mes      = new Date(hoje.getTime() - 30 * 86_400_000)

    const [
      totalUsuarios, usuariosHoje, usuariosSemana,
      totalLicitacoes, licitacoesHoje,
      usuariosPorPlano,
      scraperLogs,
      notificacoesSemana,
      alertasAtivos,
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { createdAt: { gte: hoje } } }),
      prisma.usuario.count({ where: { createdAt: { gte: semana } } }),
      prisma.licitacao.count(),
      prisma.licitacao.count({ where: { createdAt: { gte: hoje } } }),
      prisma.usuario.groupBy({ by: ['plano'], _count: { id: true } }),
      prisma.scraperLog.findMany({
        orderBy: { iniciadoEm: 'desc' },
        take: 50,
        select: { id: true, portal: true, status: true, totalNovos: true, totalErros: true, duracao: true, iniciadoEm: true, finalizadoEm: true },
      }),
      prisma.notificacao.count({ where: { createdAt: { gte: semana } } }),
      prisma.alertaConfig.count({ where: { ativo: true } }),
    ])

    // Licitações por portal (últimos 30 dias)
    const licitacoesPorPortal = await prisma.licitacao.groupBy({
      by:     ['portalOrigem'],
      _count: { id: true },
      where:  { createdAt: { gte: mes } },
      orderBy: { _count: { id: 'desc' } },
    })

    // Crescimento diário de usuários (últimos 14 dias)
    const crescimentoUsuarios = await prisma.$queryRaw<Array<{ data: string; total: bigint }>>`
      SELECT DATE(created_at)::text AS data, COUNT(*)::bigint AS total
      FROM usuarios
      WHERE created_at >= NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY data ASC
    `

    // Receita estimada por plano
    const PRECOS: Record<string, number> = { FREE: 0, BASICO: 49, PROFISSIONAL: 149, ENTERPRISE: 0 }
    const receitaEstimada = usuariosPorPlano.reduce((sum, g) => {
      return sum + (PRECOS[g.plano] ?? 0) * g._count.id
    }, 0)

    return reply.send({
      usuarios: {
        total:   totalUsuarios,
        hoje:    usuariosHoje,
        semana:  usuariosSemana,
        porPlano: Object.fromEntries(usuariosPorPlano.map((g) => [g.plano, g._count.id])),
        crescimento: crescimentoUsuarios.map((r) => ({ data: r.data, total: Number(r.total) })),
      },
      licitacoes: {
        total:    totalLicitacoes,
        hoje:     licitacoesHoje,
        porPortal: licitacoesPorPortal.map((g) => ({ portal: g.portalOrigem, total: g._count.id })),
      },
      scrapers: {
        ultimosLogs: scraperLogs,
        totalErros:  scraperLogs.filter((l) => l.status === 'FALHOU').length,
      },
      alertas:      { ativos: alertasAtivos },
      notificacoes: { semana: notificacoesSemana },
      receita:      { estimadaMensal: receitaEstimada },
    })
  })

  // ── USUÁRIOS ─────────────────────────────────────────────
  app.get('/usuarios', { preHandler: requireAdmin }, async (req, reply) => {
    const q = z.object({
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(20),
      busca:  z.string().optional(),
      plano:  z.string().optional(),
      role:   z.string().optional(),
      ativo:  z.string().optional(),
      ordem:  z.enum(['createdAt','email','nome','plano']).default('createdAt'),
      dir:    z.enum(['asc','desc']).default('desc'),
    }).parse(req.query)

    const where: any = {}
    if (q.busca) {
      where.OR = [
        { email: { contains: q.busca, mode: 'insensitive' } },
        { nome:  { contains: q.busca, mode: 'insensitive' } },
      ]
    }
    if (q.plano) where.plano = q.plano
    if (q.role)  where.role  = q.role
    if (q.ativo !== undefined) where.ativo = q.ativo === 'true'

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id: true, nome: true, email: true, plano: true, role: true,
          ativo: true, emailVerificado: true, createdAt: true, updatedAt: true,
          trialAte: true, stripeCustomerId: true, stripeSubscriptionId: true,
          telegramChatId: true, notifEmail: true, notifTelegram: true,
          _count: { select: { alertas: true, favoritos: true, sessoes: true } },
        },
        orderBy: { [q.ordem]: q.dir },
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
      }),
      prisma.usuario.count({ where }),
    ])

    return reply.send({ data: usuarios, total, page: q.page, totalPages: Math.ceil(total / q.limit) })
  })

  app.get('/usuarios/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)

    const usuario = await prisma.usuario.findUnique({
      where:  { id },
      select: {
        id: true, nome: true, email: true, plano: true, role: true,
        ativo: true, emailVerificado: true, telefone: true, avatarUrl: true,
        createdAt: true, updatedAt: true, trialAte: true,
        stripeCustomerId: true, stripeSubscriptionId: true, telegramChatId: true,
        notifEmail: true, notifTelegram: true, notifPush: true,
        alertas:    { select: { id: true, nome: true, ativo: true, palavrasChave: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
        favoritos:  { select: { id: true, createdAt: true, licitacao: { select: { titulo: true } } }, take: 10 },
        sessoes:    { select: { id: true, ip: true, userAgent: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
        _count:     { select: { alertas: true, favoritos: true, sessoes: true, notificacoes: true } },
      },
    })

    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado.' })
    return reply.send(usuario)
  })

  app.patch('/usuarios/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id }  = z.object({ id: z.string() }).parse(req.params)
    const body    = z.object({
      plano:          z.enum(['FREE','BASICO','PROFISSIONAL','ENTERPRISE']).optional(),
      ativo:          z.boolean().optional(),
      emailVerificado:z.boolean().optional(),
      role:           z.enum(['USER','ADMIN','SUPER_ADMIN']).optional(),
      nome:           z.string().min(2).optional(),
    }).parse(req.body)

    const admin = (req as any).adminUser
    // Apenas SUPER_ADMIN pode promover/rebaixar roles
    if (body.role && admin.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({ error: 'Apenas Super Admins podem alterar roles.' })
    }
    // Admin não pode se alterar
    if (id === admin.id && (body.role || body.ativo === false)) {
      return reply.status(400).send({ error: 'Você não pode alterar seu próprio role ou desativar sua conta.' })
    }

    const usuario = await prisma.usuario.update({ where: { id }, data: body, select: { id: true, nome: true, email: true, plano: true, role: true, ativo: true } })
    return reply.send(usuario)
  })

  app.delete('/usuarios/:id', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { id }  = z.object({ id: z.string() }).parse(req.params)
    const admin   = (req as any).adminUser
    if (id === admin.id) return reply.status(400).send({ error: 'Você não pode excluir sua própria conta.' })

    await prisma.usuario.delete({ where: { id } })
    return reply.send({ ok: true })
  })

  // Invalidar todas as sessões de um usuário (forçar logout)
  app.post('/usuarios/:id/logout', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    await prisma.sessao.deleteMany({ where: { usuarioId: id } })
    return reply.send({ ok: true, message: 'Todas as sessões encerradas.' })
  })

  // Resetar senha do usuário (envia e-mail de reset)
  app.post('/usuarios/:id/reset-senha', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const usuario = await prisma.usuario.findUnique({ where: { id }, select: { email: true, nome: true } })
    if (!usuario) return reply.status(404).send({ error: 'Usuário não encontrado.' })

    const token = crypto.randomBytes(32).toString('hex')
    await app.redis.setex(`reset:${token}`, 3600, id)

    const { emailService } = await import('../services/email.js')
    await emailService.enviarResetSenha(usuario.email, usuario.nome, token)

    return reply.send({ ok: true, message: 'E-mail de reset enviado.' })
  })

  // ── LICITAÇÕES ───────────────────────────────────────────
  app.get('/licitacoes', { preHandler: requireAdmin }, async (req, reply) => {
    const q = z.object({
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(20),
      busca:  z.string().optional(),
      portal: z.string().optional(),
      uf:     z.string().optional(),
      situacao:z.string().optional(),
      ordem:  z.enum(['dataAbertura','dataPublicacao','createdAt','valorEstimado']).default('createdAt'),
      dir:    z.enum(['asc','desc']).default('desc'),
    }).parse(req.query)

    const where: any = {}
    if (q.busca)   where.OR = [{ titulo: { contains: q.busca, mode: 'insensitive' } }, { objeto: { contains: q.busca, mode: 'insensitive' } }]
    if (q.portal)  where.portalOrigem = { in: q.portal.split(',') }
    if (q.uf)      where.uf           = q.uf
    if (q.situacao) where.situacao    = q.situacao

    const [licitacoes, total] = await Promise.all([
      prisma.licitacao.findMany({
        where,
        select: {
          id: true, numeroEdital: true, titulo: true, modalidade: true, situacao: true,
          portalOrigem: true, uf: true, municipio: true, valorEstimado: true,
          dataAbertura: true, dataPublicacao: true, createdAt: true, indexadoEm: true,
          orgao: { select: { razaoSocial: true } },
          _count: { select: { favoritos: true } },
        },
        orderBy: { [q.ordem]: q.dir },
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
      }),
      prisma.licitacao.count({ where }),
    ])

    return reply.send({ data: licitacoes, total, page: q.page, totalPages: Math.ceil(total / q.limit) })
  })

  app.delete('/licitacoes/:id', { preHandler: requireSuperAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    await prisma.licitacao.delete({ where: { id } })
    return reply.send({ ok: true })
  })

  // Forçar reindexação de uma licitação no ES
  app.post('/licitacoes/:id/reindexar', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params)
    const { indexarLicitacao } = await import('../../scraper/src/services/indexer.js').catch(() => ({ indexarLicitacao: null }))
    if (!indexarLicitacao) {
      // Chama via rota interna
      const apiBase = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
      await fetch(`${apiBase}/internal/indexar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
        body:    JSON.stringify({ licitacaoId: id }),
      })
    }
    return reply.send({ ok: true })
  })

  // ── SCRAPERS ─────────────────────────────────────────────
  app.get('/scrapers/logs', { preHandler: requireAdmin }, async (req, reply) => {
    const q = z.object({
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(50),
      portal: z.string().optional(),
      status: z.string().optional(),
    }).parse(req.query)

    const where: any = {}
    if (q.portal) where.portal = q.portal
    if (q.status) where.status = q.status

    const [logs, total] = await Promise.all([
      prisma.scraperLog.findMany({
        where,
        orderBy: { iniciadoEm: 'desc' },
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
      }),
      prisma.scraperLog.count({ where }),
    ])

    return reply.send({ data: logs, total, page: q.page, totalPages: Math.ceil(total / q.limit) })
  })

  app.get('/scrapers/stats', { preHandler: requireAdmin }, async (_req, reply) => {
    const semana = new Date(Date.now() - 7 * 86_400_000)

    const [porPortal, porStatus] = await Promise.all([
      prisma.scraperLog.groupBy({
        by:     ['portal'],
        _count: { id: true },
        _sum:   { totalNovos: true, totalErros: true },
        _avg:   { duracao: true },
        where:  { iniciadoEm: { gte: semana } },
      }),
      prisma.scraperLog.groupBy({
        by:     ['status'],
        _count: { id: true },
        where:  { iniciadoEm: { gte: semana } },
      }),
    ])

    return reply.send({ porPortal, porStatus })
  })

  // Disparar coleta manual de um portal
  app.post('/scrapers/disparar', { preHandler: requireAdmin }, async (req, reply) => {
    const body = z.object({
      portal:  z.string(),
      paginas: z.coerce.number().min(1).max(20).default(5),
      uf:      z.string().optional(),
    }).parse(req.body)

    // Chama via BullMQ — adiciona job com prioridade alta
    const { scraperQueue } = await import('../../scraper/src/queue/index.js').catch(() => ({ scraperQueue: null }))
    if (scraperQueue) {
      await (scraperQueue as any).add(`admin-${body.portal}-${Date.now()}`, {
        portal: body.portal, paginas: body.paginas, uf: body.uf,
      }, { priority: 1 })
    } else {
      // Fallback: chamar CLI via processo filho
      const { exec } = await import('node:child_process')
      exec(`npx tsx apps/scraper/src/cli.ts --portal=${body.portal} --paginas=${body.paginas}`)
    }

    return reply.send({ ok: true, message: `Coleta de ${body.portal} iniciada.` })
  })

  // ── NOTIFICAÇÕES ─────────────────────────────────────────
  app.get('/notificacoes', { preHandler: requireAdmin }, async (req, reply) => {
    const q = z.object({
      page:   z.coerce.number().default(1),
      limit:  z.coerce.number().max(100).default(20),
      status: z.string().optional(),
      canal:  z.string().optional(),
    }).parse(req.query)

    const where: any = {}
    if (q.status) where.status = q.status
    if (q.canal)  where.canal  = q.canal

    const [notifs, total] = await Promise.all([
      prisma.notificacao.findMany({
        where,
        select: {
          id: true, canal: true, status: true, erro: true, enviadoEm: true, createdAt: true,
          usuario:  { select: { nome: true, email: true } },
          licitacao: { select: { titulo: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
      }),
      prisma.notificacao.count({ where }),
    ])

    return reply.send({ data: notifs, total, page: q.page, totalPages: Math.ceil(total / q.limit) })
  })

  // ── ALERTAS GLOBAIS ──────────────────────────────────────
  app.get('/alertas', { preHandler: requireAdmin }, async (req, reply) => {
    const q = z.object({
      page:  z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(20),
    }).parse(req.query)

    const [alertas, total] = await Promise.all([
      prisma.alertaConfig.findMany({
        select: {
          id: true, nome: true, palavrasChave: true, modalidades: true,
          portais: true, ufs: true, canal: true, frequencia: true, ativo: true, createdAt: true,
          usuario: { select: { nome: true, email: true, plano: true } },
          _count:  { select: { notificacoes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (q.page - 1) * q.limit,
        take:    q.limit,
      }),
      prisma.alertaConfig.count(),
    ])

    return reply.send({ data: alertas, total, page: q.page, totalPages: Math.ceil(total / q.limit) })
  })

  // ── SISTEMA ──────────────────────────────────────────────
  app.get('/sistema/saude', { preHandler: requireAdmin }, async (_req, reply) => {
    const checks: Record<string, { ok: boolean; ms?: number; erro?: string }> = {}

    // PostgreSQL
    const t0 = Date.now()
    try {
      await prisma.$queryRaw`SELECT 1`
      checks['postgres'] = { ok: true, ms: Date.now() - t0 }
    } catch (e) {
      checks['postgres'] = { ok: false, erro: String(e) }
    }

    // Redis
    const t1 = Date.now()
    try {
      await app.redis.ping()
      checks['redis'] = { ok: true, ms: Date.now() - t1 }
    } catch (e) {
      checks['redis'] = { ok: false, erro: String(e) }
    }

    // ElasticSearch
    const t2 = Date.now()
    try {
      await app.elastic.ping()
      checks['elasticsearch'] = { ok: true, ms: Date.now() - t2 }
    } catch (e) {
      checks['elasticsearch'] = { ok: false, erro: String(e) }
    }

    const tudoOk = Object.values(checks).every((c) => c.ok)
    return reply.status(tudoOk ? 200 : 503).send({ ok: tudoOk, checks, ts: new Date().toISOString() })
  })

  app.get('/sistema/config', { preHandler: requireSuperAdmin }, async (_req, reply) => {
    return reply.send({
      nodeVersion:    process.version,
      nodeEnv:        process.env.NODE_ENV,
      uptime:         process.uptime(),
      memoryMB:       Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      esIndexName:    process.env.ELASTICSEARCH_INDEX_LICITACOES,
      scraperConcur:  process.env.SCRAPER_CONCURRENCY,
      telegramBot:    !!process.env.TELEGRAM_BOT_TOKEN,
      sendgrid:       !!process.env.SENDGRID_API_KEY,
      stripe:         !!process.env.STRIPE_SECRET_KEY,
      sentry:         !!process.env.SENTRY_DSN,
    })
  })
}
