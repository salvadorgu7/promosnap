/**
 * Hybrid cache: tries Redis first (if available), falls back to in-memory Map with TTL.
 *
 * Predefined TTLs:
 *   - search:    5 min  (300s)
 *   - trending: 10 min  (600s)
 *   - scorecard: 15 min (900s)
 *
 * Usage:
 *   import { cache } from '@/lib/cache'
 *   const data = await cache.getOrSet('search:iphone', () => fetchData(), 300)
 */

// ── In-memory TTL cache ──

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private maxEntries = 1000

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict expired entries if store is getting large
    if (this.store.size >= this.maxEntries) {
      this.evictExpired()
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  private evictExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
    // If still too large, drop oldest 25%
    if (this.store.size >= this.maxEntries) {
      const keys = Array.from(this.store.keys())
      const toRemove = Math.floor(keys.length * 0.25)
      for (let i = 0; i < toRemove; i++) {
        this.store.delete(keys[i])
      }
    }
  }
}

// ── Redis-backed cache (optional) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisCache: any = null

let redisAvailable = false

async function tryInitRedis(): Promise<boolean> {
  if (redisCache !== null) return redisAvailable
  try {
    const { redis } = await import('@/lib/db/redis')
    // Quick ping to check connection
    await redis.ping()
    redisCache = redis
    redisAvailable = true
    return true
  } catch {
    redisAvailable = false
    return false
  }
}

// ── Unified cache interface ──

const memory = new MemoryCache()

// Lazy-init Redis on first use (non-blocking)
let redisInitPromise: Promise<boolean> | null = null

function ensureRedisInit(): Promise<boolean> {
  if (!redisInitPromise) {
    redisInitPromise = tryInitRedis()
  }
  return redisInitPromise
}

export const cache = {
  /**
   * Get value from cache (Redis -> memory fallback).
   */
  async get<T>(key: string): Promise<T | null> {
    // Try memory first (faster)
    const memValue = memory.get<T>(key)
    if (memValue !== null) return memValue

    // Try Redis
    try {
      const hasRedis = await ensureRedisInit()
      if (hasRedis && redisCache) {
        const raw = await redisCache.get(`promosnap:${key}`)
        if (raw) {
          const parsed = JSON.parse(raw) as T
          // Populate memory cache too (shorter TTL)
          memory.set(key, parsed, 60)
          return parsed
        }
      }
    } catch {}

    return null
  },

  /**
   * Set value in cache (both Redis and memory).
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    memory.set(key, value, ttlSeconds)
    try {
      const hasRedis = await ensureRedisInit()
      if (hasRedis && redisCache) {
        await redisCache.set(`promosnap:${key}`, JSON.stringify(value), 'EX', ttlSeconds)
      }
    } catch {}
  },

  /**
   * Get-or-set: return cached value or compute and cache it.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await cache.get<T>(key)
    if (cached !== null) return cached

    const value = await fetcher()
    await cache.set(key, value, ttlSeconds)
    return value
  },

  /**
   * Delete from both caches.
   */
  async delete(key: string): Promise<void> {
    memory.delete(key)
    try {
      const hasRedis = await ensureRedisInit()
      if (hasRedis && redisCache) {
        await redisCache.del(`promosnap:${key}`)
      }
    } catch {}
  },

  /**
   * Clear memory cache only (Redis is shared).
   */
  clearMemory(): void {
    memory.clear()
  },
}

// ── Predefined TTL constants ──

export const CACHE_TTL = {
  SEARCH: 300,       // 5 min
  TRENDING: 600,     // 10 min
  SCORECARD: 900,    // 15 min
  CATEGORIES: 1800,  // 30 min
  BRANDS: 1800,      // 30 min
} as const

export default cache
