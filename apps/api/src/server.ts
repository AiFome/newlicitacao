// apps/api/src/server.ts
// apps/api/src/server.ts
import { initSentry, captureException } from './lib/sentry.js'

// Sentry deve ser iniciado antes de qualquer outro import
initSentry()

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { authRoutes } from './routes/auth.js'
import { licitacaoRoutes } from './routes/licitacoes.js'
import { exportarRoutes }  from './routes/exportar.js'
import { alertaRoutes } from './routes/alertas.js'
import { favoritoRoutes } from './routes/favoritos.js'
import { usuarioRoutes } from './routes/usuarios.js'
import { stripeRoutes } from './routes/stripe.js'
import { webhookRoutes } from './routes/webhooks.js'
import { wsRoutes } from './routes/websocket.js'
import { internalRoutes } from './routes/internal.js'
import { adminRoutes }    from './routes/admin.js'
import { elasticPlugin } from './plugins/elasticsearch.js'
import { redisPlugin } from './plugins/redis.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

// ── Plugins de infraestrutura ──────────────────────────
await app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
  credentials: true,
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  redis: undefined, // substitua por instância Redis em produção
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' },
})

await app.register(websocket)
await app.register(elasticPlugin)
await app.register(redisPlugin)

// ── Swagger / Documentação ─────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  await app.register(swagger, {
    openapi: {
      info: { title: 'LicitaBR API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })
}

// ── Tratamento de erros ────────────────────────────────
app.setErrorHandler(errorHandler)

// ── Rotas ──────────────────────────────────────────────
await app.register(authRoutes,      { prefix: '/v1/auth' })
await app.register(licitacaoRoutes, { prefix: '/v1/licitacoes' })
await app.register(exportarRoutes,  { prefix: '/v1/exportar' })
await app.register(alertaRoutes,    { prefix: '/v1/alertas' })
await app.register(favoritoRoutes,  { prefix: '/v1/favoritos' })
await app.register(usuarioRoutes,   { prefix: '/v1/usuarios' })
await app.register(stripeRoutes,    { prefix: '/v1/stripe' })
await app.register(webhookRoutes,   { prefix: '/v1/webhooks' })
await app.register(internalRoutes, { prefix: '/internal' })
await app.register(adminRoutes,    { prefix: '/v1/admin' })
await app.register(wsRoutes)

// ── Health check ───────────────────────────────────────
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version,
}))

// ── Start ──────────────────────────────────────────────
try {
  const port = Number(process.env.API_PORT ?? 3001)
  const host = process.env.API_HOST ?? '0.0.0.0'
  await app.listen({ port, host })
  app.log.info(`API rodando em http://${host}:${port}`)
  if (process.env.NODE_ENV !== 'production') {
    app.log.info(`Docs disponíveis em http://${host}:${port}/docs`)
  }
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
