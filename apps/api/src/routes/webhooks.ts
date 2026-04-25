// apps/api/src/routes/webhooks.ts
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@licitabr/database'
import { telegramService } from '../services/telegram.js'

// Planos válidos do sistema — valida o que vem dos metadados do Stripe
const PLANOS_VALIDOS = ['FREE', 'BASICO', 'PROFISSIONAL', 'ENTERPRISE'] as const
type PlanoValido = typeof PLANOS_VALIDOS[number]

function normalizarPlano(valor: unknown): PlanoValido {
  const str = String(valor ?? '').toUpperCase().trim()
  return PLANOS_VALIDOS.includes(str as PlanoValido)
    ? (str as PlanoValido)
    : 'PROFISSIONAL' // fallback seguro
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/webhooks/stripe
  app.post('/stripe', { config: { rawBody: true } }, async (req, reply) => {
    // Em produção: validar assinatura com stripe.webhooks.constructEvent()
    // const sig = req.headers['stripe-signature']
    // const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    const event = req.body as { type: string; data: { object: Record<string, unknown> } }

    app.log.info(`[Stripe Webhook] ${event.type}`)

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object

        const usuarioId    = session['client_reference_id'] as string | undefined
        const customerId   = session['customer'] as string | undefined
        const subscriptionId = session['subscription'] as string | undefined

        // Lê o plano dos metadados gravados no checkout — não usa valor hardcoded
        const metadata = (session['metadata'] ?? {}) as Record<string, string>
        const plano    = normalizarPlano(metadata['plano'])

        if (!usuarioId) {
          app.log.warn('[Stripe] checkout.session.completed sem client_reference_id')
          break
        }

        await prisma.usuario.update({
          where: { id: usuarioId },
          data: {
            plano,
            stripeCustomerId:     customerId    ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
          },
        })

        app.log.info(`[Stripe] Usuário ${usuarioId} → plano ${plano}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const customerId = sub['customer'] as string
        const status     = sub['status'] as string

        // Lê plano dos metadados da subscription
        const metadata = (sub['metadata'] ?? {}) as Record<string, string>
        const plano    = normalizarPlano(metadata['plano'])

        const usuario = await prisma.usuario.findFirst({
          where:  { stripeCustomerId: customerId },
          select: { id: true },
        })

        if (usuario) {
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
              ativo: status === 'active' || status === 'trialing',
              // Atualiza plano se vier nos metadados
              ...(metadata['plano'] ? { plano } : {}),
            },
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object
        const customerId = sub['customer'] as string

        const usuario = await prisma.usuario.findFirst({
          where:  { stripeCustomerId: customerId },
          select: { id: true, email: true },
        })

        if (usuario) {
          await prisma.usuario.update({
            where: { id: usuario.id },
            data:  { plano: 'FREE', stripeSubscriptionId: null },
          })
          app.log.info(`[Stripe] Assinatura cancelada: ${usuario.email} → FREE`)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object
        const customerId = invoice['customer'] as string
        const attemptCount = invoice['attempt_count'] as number ?? 1

        const usuario = await prisma.usuario.findFirst({
          where:  { stripeCustomerId: customerId },
          select: { id: true, email: true, nome: true },
        })

        if (usuario) {
          app.log.warn(`[Stripe] Pagamento falhou (tentativa ${attemptCount}): ${usuario.email}`)

          // Envia e-mail de aviso ao usuário
          const { emailService } = await import('../services/email.js')
          emailService.enviarPagamentoRecusado(usuario.email, usuario.nome, attemptCount)
            .catch((err: Error) => app.log.error('[Stripe] Erro ao enviar e-mail de pagamento recusado:', err))
        }
        break
      }

      default:
        app.log.debug(`[Stripe] Evento ignorado: ${event.type}`)
    }

    return reply.send({ received: true })
  })

  // POST /v1/webhooks/telegram — recebe mensagens do bot
  app.post('/telegram', async (req, reply) => {
    try {
      await telegramService.processarUpdate(req.body as Record<string, unknown>)
    } catch (err) {
      app.log.error(`[Telegram Webhook] ${err}`)
    }
    return reply.send({ ok: true })
  })
}
