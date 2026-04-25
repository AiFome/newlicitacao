// apps/api/src/routes/usuarios.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'

const atualizarPerfilSchema = z.object({
  nome:          z.string().min(2).max(100).optional(),
  telefone:      z.string().max(20).nullable().optional(),
  notifEmail:    z.boolean().optional(),
  notifTelegram: z.boolean().optional(),
  notifPush:     z.boolean().optional(),
  telegramChatId:z.string().max(20).nullable().optional(),
})

const alterarSenhaSchema = z.object({
  senhaAtual: z.string(),
  novaSenha:  z.string().min(8).max(100),
})

const CAMPOS_SENSIVEIS = {
  id:            true,
  email:         true,
  nome:          true,
  telefone:      true,
  plano:         true,
  ativo:         true,
  emailVerificado: true,
  trialAte:      true,
  notifEmail:    true,
  notifTelegram: true,
  notifPush:     true,
  telegramChatId:true,
  createdAt:     true,
  updatedAt:     true,
} as const

export const usuarioRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate)

  // GET /v1/usuarios/me — perfil completo do usuário logado
  app.get('/me', async (req, reply) => {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where:  { id: req.usuario.id },
      select: CAMPOS_SENSIVEIS,
    })
    return reply.send(usuario)
  })

  // PATCH /v1/usuarios/me — atualiza perfil e preferências
  app.patch('/me', async (req, reply) => {
    const body = atualizarPerfilSchema.parse(req.body)

    // Filtra campos undefined para não sobrescrever com null acidentalmente
    const data: Record<string, unknown> = {}
    if (body.nome           !== undefined) data.nome           = body.nome.trim()
    if (body.telefone       !== undefined) data.telefone       = body.telefone
    if (body.notifEmail     !== undefined) data.notifEmail     = body.notifEmail
    if (body.notifTelegram  !== undefined) data.notifTelegram  = body.notifTelegram
    if (body.notifPush      !== undefined) data.notifPush      = body.notifPush
    if (body.telegramChatId !== undefined) data.telegramChatId = body.telegramChatId

    if (Object.keys(data).length === 0) {
      return reply.status(400).send({ error: 'Nenhum campo para atualizar.' })
    }

    const usuario = await prisma.usuario.update({
      where:  { id: req.usuario.id },
      data,
      select: CAMPOS_SENSIVEIS,
    })

    return reply.send(usuario)
  })

  // PUT /v1/usuarios/me/senha — altera senha com verificação da senha atual
  app.put('/me/senha', async (req, reply) => {
    const body = alterarSenhaSchema.parse(req.body)

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where:  { id: req.usuario.id },
      select: { senhaHash: true },
    })

    const senhaCorreta = await bcrypt.compare(body.senhaAtual, usuario.senhaHash)
    if (!senhaCorreta) {
      return reply.status(400).send({ error: 'Senha atual incorreta.' })
    }

    if (body.senhaAtual === body.novaSenha) {
      return reply.status(400).send({ error: 'A nova senha deve ser diferente da atual.' })
    }

    const novaSenhaHash = await bcrypt.hash(body.novaSenha, 12)
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data:  { senhaHash: novaSenhaHash },
    })

    // Invalida todas as sessões existentes para forçar novo login
    await prisma.sessao.deleteMany({ where: { usuarioId: req.usuario.id } })

    return reply.send({ ok: true, mensagem: 'Senha alterada. Faça login novamente.' })
  })

  // DELETE /v1/usuarios/me — solicita exclusão de conta (soft delete por segurança)
  app.delete('/me', async (req, reply) => {
    // Desativa a conta em vez de deletar — dados são preservados por 30 dias
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data:  {
        ativo:  false,
        email:  `deleted_${Date.now()}_${req.usuario.email}`, // libera o e-mail
      },
    })

    // Invalida todas as sessões
    await prisma.sessao.deleteMany({ where: { usuarioId: req.usuario.id } })

    // Desativa todos os alertas
    await prisma.alertaConfig.updateMany({
      where: { usuarioId: req.usuario.id },
      data:  { ativo: false },
    })

    return reply.send({ ok: true, mensagem: 'Conta desativada.' })
  })

  // GET /v1/usuarios/me/stats — estatísticas do usuário para o dashboard
  app.get('/me/stats', async (req, reply) => {
    const [alertasAtivos, totalFavoritos, totalNotificacoes, ultimaNotificacao] =
      await prisma.$transaction([
        prisma.alertaConfig.count({
          where: { usuarioId: req.usuario.id, ativo: true },
        }),
        prisma.favorito.count({
          where: { usuarioId: req.usuario.id },
        }),
        prisma.notificacao.count({
          where: { usuarioId: req.usuario.id, status: 'ENVIADO' },
        }),
        prisma.notificacao.findFirst({
          where:   { usuarioId: req.usuario.id, status: 'ENVIADO' },
          orderBy: { enviadoEm: 'desc' },
          select:  { enviadoEm: true },
        }),
      ])

    return reply.send({
      alertasAtivos,
      totalFavoritos,
      totalNotificacoes,
      ultimaNotificacaoEm: ultimaNotificacao?.enviadoEm ?? null,
    })
  })

  // GET /v1/usuarios/me/sessoes — lista sessões ativas
  app.get('/me/sessoes', async (req, reply) => {
    const sessoes = await prisma.sessao.findMany({
      where:   { usuarioId: req.usuario.id, expiresAt: { gt: new Date() } },
      select:  { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(sessoes)
  })

  // DELETE /v1/usuarios/me/sessoes/:id — revoga uma sessão específica
  app.delete<{ Params: { id: string } }>('/me/sessoes/:id', async (req, reply) => {
    await prisma.sessao.deleteMany({
      where: { id: req.params.id, usuarioId: req.usuario.id },
    })
    return reply.send({ ok: true })
  })

  // DELETE /v1/usuarios/me/sessoes — revoga todas as sessões (exceto a atual)
  app.delete('/me/sessoes', async (req, reply) => {
    const tokenAtual = req.headers.authorization?.replace('Bearer ', '')
    await prisma.sessao.deleteMany({
      where: {
        usuarioId: req.usuario.id,
        ...(tokenAtual && { token: { not: tokenAtual } }),
      },
    })
    return reply.send({ ok: true, mensagem: 'Todas as outras sessões foram encerradas.' })
  })
}
