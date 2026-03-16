import { logger } from "@/lib/logger"

type RedisClient = import('ioredis').default

const globalForRedis = globalThis as unknown as { redis: RedisClient | null | undefined }

async function createRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    const { default: Redis } = await import('ioredis')
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
    })
    client.on('error', () => {
      // Silently handle Redis errors — it's a cache, not critical
    })
    return client
  } catch {
    return null
  }
}

let redisPromise: Promise<RedisClient | null> | null = null

function getRedis(): Promise<RedisClient | null> {
  if (globalForRedis.redis !== undefined) return Promise.resolve(globalForRedis.redis)
  if (!redisPromise) {
    redisPromise = createRedisClient().then(client => {
      if (process.env.NODE_ENV !== 'production') globalForRedis.redis = client
      return client
    })
  }
  return redisPromise
}

export const redis: RedisClient | null = null // Keep export for backward compat

export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await getRedis()
  if (!r) return null
  try {
    const data = await r.get(`promosnap:${key}`)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const r = await getRedis()
  if (!r) return
  try { await r.set(`promosnap:${key}`, JSON.stringify(value), 'EX', ttlSeconds) } catch (err) { logger.debug("redis.op-failed", { error: err }) }
}

export async function cacheDelete(key: string): Promise<void> {
  const r = await getRedis()
  if (!r) return
  try { await r.del(`promosnap:${key}`) } catch (err) { logger.debug("redis.op-failed", { error: err }) }
}

export default redis
