import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('[Redis] REDIS_URL not set, using localhost:6379')
    return new Redis({ maxRetriesPerRequest: 3 })
  }
  return new Redis(url, { maxRetriesPerRequest: 3 })
}

export const redis = globalForRedis.redis ?? createRedisClient()
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(`promosnap:${key}`)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try { await redis.set(`promosnap:${key}`, JSON.stringify(value), 'EX', ttlSeconds) } catch {}
}

export async function cacheDelete(key: string): Promise<void> {
  try { await redis.del(`promosnap:${key}`) } catch {}
}

export default redis
