import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | null | undefined }

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) {
    // No Redis configured — all cache ops gracefully return null/void
    return null
  }
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null // stop retrying
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

export const redis = globalForRedis.redis !== undefined ? globalForRedis.redis : createRedisClient()
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const data = await redis.get(`promosnap:${key}`)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return
  try { await redis.set(`promosnap:${key}`, JSON.stringify(value), 'EX', ttlSeconds) } catch {}
}

export async function cacheDelete(key: string): Promise<void> {
  if (!redis) return
  try { await redis.del(`promosnap:${key}`) } catch {}
}

export default redis
