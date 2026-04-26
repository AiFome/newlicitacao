// apps/api/src/routes/auth.ts — versão completa com reset e verificação
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'
import { emailService } from '../services/email.js'

const registerSchema = z.object({
  nome:  z.string().min(2).max(100),
  email: z.string().email(),
  senha: z.string().min(8).max(100),
})
const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
})
const esqueciSchema     = z.object({ email: z.string().email() })
const redefinirSchema   = z.object({ token: z.string().min(1), novaSenha: z.string().min(8).max(100) })

const TOKEN_EXPIRY_S = 3600 // 1 hora

function gerarToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export const authRoutes: FastifyPluginAsync = async (app) => {

  // ── Registro ────────────────────────────────────────────
  app.post('/register', async (req, reply) => {
    const body = registerSchema.parse(req.body)
    const existe = await prisma.usuario.findUnique({ where: { email: body.email } })
    if (existe) return reply.status(409).send({ error: 'E-mail já cadastrado.' })

    const senhaHash = await bcrypt.hash(body.senha, 12)
    const usuario   = await prisma.usuario.create({
      data: {
        nome: body.nome, email: body.email, senhaHash,
        plano: 'FREE', trialAte: new Date(Date.now() + 14 * 86_400_000),
      },
      select: { id: true, email: true, nome: true, plano: true, emailVerificado: true, role: true },
    })

    // Grava token de verificação no Redis (24h)
    const verifyToken = gerarToken()
    await app.redis.setex(`verify:${verifyToken}`, 86400, usuario.id)
    emailService.enviarVerificacaoEmail(usuario.email, usuario.nome, verifyToken)
      .catch((e) => app.log.error('[Auth] verify email error:', e))

    const token = app.jwt.sign({ sub: usuario.id, email: usuario.email, plano: usuario.plano, role: usuario.role ?? 'USER' }, { expiresIn: '2h' })
    return reply.status(201).send({ usuario, token })
  })

  // ── Login ───────────────────────────────────────────────
  app.post('/login', async (req, reply) => {
    const body    = loginSchema.parse(req.body)
    const usuario = await prisma.usuario.findUnique({
      where:  { email: body.email },
      select: { id: true, email: true, nome: true, plano: true,
                senhaHash: true, ativo: true, emailVerificado: true, role: true },
    })
    if (!usuario || !usuario.ativo) return reply.status(401).send({ error: 'Credenciais inválidas.' })

    const ok = await bcrypt.compare(body.senha, usuario.senhaHash)
    if (!ok) return reply.status(401).send({ error: 'Credenciais inválidas.' })

    const token = app.jwt.sign({ sub: usuario.id, email: usuario.email, plano: usuario.plano, role: usuario.role ?? 'USER' }, { expiresIn: '2h' })
    await prisma.sessao.create({
      data: { usuarioId: usuario.id, token, userAgent: req.headers['user-agent'], ip: req.ip, expiresAt: new Date(Date.now() + 7 * 86_400_000) },
    })
    const { senhaHash: _, ...rest } = usuario
    return reply.send({ usuario: rest, token })
  })

  // ── Logout ──────────────────────────────────────────────
  app.post('/logout', async (req, reply) => {
    const auth = req.headers.authorization?.replace('Bearer ', '')
    if (auth) await prisma.sessao.deleteMany({ where: { token: auth } })
    return reply.send({ ok: true })
  })

  // ── Me ──────────────────────────────────────────────────
  app.get('/me', async (req, reply) => {
    try {
      const { sub } = (await req.jwtVerify()) as { sub: string }
      const usuario = await prisma.usuario.findUniqueOrThrow({
        where:  { id: sub },
        select: { id: true, email: true, nome: true, plano: true, ativo: true, trialAte: true, emailVerificado: true, role: true, notifEmail: true, notifTelegram: true, notifPush: true, createdAt: true },
      })
      return reply.send(usuario)
    } catch { return reply.status(401).send({ error: 'Não autenticado.' }) }
  })

  // ── Esqueci a senha ─────────────────────────────────────
  app.post('/esqueci-senha', async (req, reply) => {
    const { email } = esqueciSchema.parse(req.body)
    const RESPOSTA  = { ok: true, mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.' }

    const usuario = await prisma.usuario.findUnique({ where: { email }, select: { id: true, nome: true, ativo: true } })
    if (!usuario?.ativo) {
      await new Promise((r) => setTimeout(r, 300)) // timing-safe
      return reply.send(RESPOSTA)
    }

    // Rate limit: 1 reset por 5 min por usuário
    const rateKey = `reset_rate:${usuario.id}`
    if (await app.redis.exists(rateKey)) {
      return reply.status(429).send({ error: 'Aguarde 5 minutos antes de solicitar outro link.' })
    }
    await app.redis.setex(rateKey, 300, '1')

    const token = gerarToken()
    await app.redis.setex(`reset:${token}`, TOKEN_EXPIRY_S, usuario.id)
    emailService.enviarResetSenha(email, usuario.nome, token)
      .catch((e) => app.log.error('[Auth] reset email error:', e))

    return reply.send(RESPOSTA)
  })

  // ── Redefinir senha ─────────────────────────────────────
  app.post('/redefinir-senha', async (req, reply) => {
    const { token, novaSenha } = redefinirSchema.parse(req.body)

    // getdel: lê e apaga atomicamente → token de uso único
    const usuarioId = await app.redis.getdel(`reset:${token}`)
    if (!usuarioId) {
      return reply.status(400).send({ error: 'Token inválido ou expirado. Solicite um novo link.' })
    }

    const senhaHash = await bcrypt.hash(novaSenha, 12)
    await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } })
    await prisma.sessao.deleteMany({ where: { usuarioId } }) // invalida sessões antigas

    return reply.send({ ok: true, mensagem: 'Senha redefinida. Faça login com a nova senha.' })
  })

  // ── Verificar e-mail (via link no e-mail) ───────────────
  app.get('/verificar-email', async (req, reply) => {
    const { token } = req.query as { token?: string }
    if (!token) return reply.status(400).send({ error: 'Token ausente.' })

    const usuarioId = await app.redis.getdel(`verify:${token}`)
    if (!usuarioId) {
      return reply.status(400).send({ error: 'Link inválido ou expirado.' })
    }

    await prisma.usuario.update({ where: { id: usuarioId }, data: { emailVerificado: true } })

    const frontendBase = process.env.NEXT_PUBLIC_API_URL?.replace(':3001', ':3000') ?? 'http://localhost:3000'
    return reply.redirect(`${frontendBase}/dashboard?emailVerificado=1`)
  })

  // ── Reenviar verificação (autenticado) ──────────────────
  app.post('/reenviar-verificacao', { preHandler: authenticate }, async (req, reply) => {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where:  { id: req.usuario.id },
      select: { email: true, nome: true, emailVerificado: true },
    })
    if (usuario.emailVerificado) return reply.status(400).send({ error: 'E-mail já verificado.' })

    const rateKey = `verify_rate:${req.usuario.id}`
    if (await app.redis.exists(rateKey)) return reply.status(429).send({ error: 'Aguarde 5 minutos.' })
    await app.redis.setex(rateKey, 300, '1')

    const token = gerarToken()
    await app.redis.setex(`verify:${token}`, 86400, req.usuario.id)
    await emailService.enviarVerificacaoEmail(usuario.email, usuario.nome, token)

    return reply.send({ ok: true })
  })

  // POST /v1/auth/reenviar-verificacao-publico — reenvio sem autenticação (via e-mail)
  app.post('/reenviar-verificacao-publico', async (req, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body)
    const RESPOSTA  = { ok: true, mensagem: 'Se o e-mail estiver cadastrado e não verificado, você receberá o link.' }

    const usuario = await prisma.usuario.findUnique({
      where:  { email },
      select: { id: true, nome: true, emailVerificado: true, ativo: true },
    })

    if (!usuario?.ativo || usuario.emailVerificado) {
      await new Promise((r) => setTimeout(r, 200))
      return reply.send(RESPOSTA)
    }

    // Rate limit: 1 reenvio por 5 min por e-mail
    const rateKey = `verify_rate_pub:${email}`
    if (await app.redis.exists(rateKey)) {
      return reply.status(429).send({ error: 'Aguarde 5 minutos antes de reenviar.' })
    }
    await app.redis.setex(rateKey, 300, '1')

    const token = gerarToken()
    await app.redis.setex(`verify:${token}`, 86400, usuario.id)
    emailService.enviarVerificacaoEmail(email, usuario.nome, token).catch(() => {})

    return reply.send(RESPOSTA)
  })

  // POST /v1/auth/renovar — renova o token por mais 2h (requer token válido)
  app.post('/renovar', { preHandler: authenticate }, async (req, reply) => {
    const payload = (req as any).user as { sub: string }
    const usuario = await prisma.usuario.findUnique({
      where:  { id: payload.sub },
      select: { id: true, email: true, plano: true, role: true, ativo: true },
    })
    if (!usuario?.ativo) return reply.status(401).send({ error: 'Conta inativa.' })
    const token = app.jwt.sign({ sub: usuario.id, email: usuario.email, plano: usuario.plano, role: usuario.role ?? 'USER' }, { expiresIn: '2h' })
    return reply.send({ token })
  })

}