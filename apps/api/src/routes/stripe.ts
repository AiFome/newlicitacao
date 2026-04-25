// apps/api/src/routes/stripe.ts
import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import Stripe from 'stripe'
import { prisma } from '@licitabr/database'
import { authenticate } from '../middleware/auth.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

const checkoutSchema = z.object({
  priceId: z.string(),
  plano:   z.enum(['BASICO', 'PROFISSIONAL', 'ENTERPRISE']),
})

const PLANO_MAP: Record<string, string> = {
  BASICO:        'Básico',
  PROFISSIONAL:  'Profissional',
  ENTERPRISE:    'Enterprise',
}

export const stripeRoutes: FastifyPluginAsync = async (app) => {

  // POST /v1/stripe/checkout — cria sessão de checkout
  app.post('/checkout', { preHandler: authenticate }, async (req, reply) => {
    const { priceId, plano } = checkoutSchema.parse(req.body)

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where:  { id: req.usuario.id },
      select: { id: true, email: true, nome: true, stripeCustomerId: true, plano: true },
    })

    // Não permite comprar o plano atual
    if (usuario.plano === plano) {
      return reply.status(400).send({ error: 'Você já possui este plano.' })
    }

    const frontendBase = process.env.NEXT_PUBLIC_API_URL?.replace(':3001', ':3000') ?? 'http://localhost:3000'

    // Cria ou recupera customer no Stripe
    let customerId = usuario.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: usuario.email,
        name:  usuario.nome,
        metadata: { usuarioId: usuario.id },
      })
      customerId = customer.id
      await prisma.usuario.update({
        where: { id: usuario.id },
        data:  { stripeCustomerId: customerId },
      })
    }

    // Cria sessão de checkout com trial de 14 dias
    const session = await stripe.checkout.sessions.create({
      customer:            customerId,
      client_reference_id: usuario.id,
      payment_method_types: ['card'],
      mode:                'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { usuarioId: usuario.id, plano },
      },
      success_url: `${frontendBase}/planos?success=1`,
      cancel_url:  `${frontendBase}/planos?cancelled=1`,
      locale:      'pt-BR',
      metadata: { usuarioId: usuario.id, plano },
    })

    return reply.send({ url: session.url })
  })

  // POST /v1/stripe/portal — portal de gerenciamento de assinatura
  app.post('/portal', { preHandler: authenticate }, async (req, reply) => {
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where:  { id: req.usuario.id },
      select: { stripeCustomerId: true },
    })

    if (!usuario.stripeCustomerId) {
      return reply.status(400).send({ error: 'Nenhuma assinatura encontrada.' })
    }

    const frontendBase = process.env.NEXT_PUBLIC_API_URL?.replace(':3001', ':3000') ?? 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer:   usuario.stripeCustomerId,
      return_url: `${frontendBase}/configuracoes`,
    })

    return reply.send({ url: session.url })
  })
}
