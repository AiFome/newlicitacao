// apps/api/src/plugins/redis.ts
import fp from 'fastify-plugin'
import IORedis from 'ioredis'
import type { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    redis: IORedis
  }
}

const redisPlugin: FastifyPluginAsync = async (app) => {
  const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  })

  await redis.connect()

  app.decorate('redis', redis)

  app.addHook('onClose', async () => {
    await redis.quit()
  })

  app.log.info('[Redis] Conectado')
}

export default fp(redisPlugin, { name: 'redis' })
export { redisPlugin }

// ── Helpers de cache ──────────────────────────────────────────────────────

export async function withCache<T>(
  redis: IORedis,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)
  if (cached) {
    return JSON.parse(cached) as T
  }

  const result = await fn()
  await redis.setex(key, ttlSeconds, JSON.stringify(result))
  return result
}

export async function invalidateCache(redis: IORedis, pattern: string) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
