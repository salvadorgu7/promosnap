/**
 * Simple in-memory TTL cache with LRU eviction.
 *
 * - Max 500 entries (configurable)
 * - Entries expire after their TTL
 * - When full, least-recently-used entries are evicted first
 *
 * Usage:
 *   import { memoryCache } from '@/lib/cache/memory'
 *   memoryCache.set('key', value, 60_000)  // 60s TTL
 *   const val = memoryCache.get('key')
 */

interface CacheEntry<T = unknown> {
  value: T
  expiresAt: number
  lastAccessed: number
}

const MAX_ENTRIES = 500

class LRUMemoryCache {
  private store = new Map<string, CacheEntry>()
  private readonly maxEntries: number

  constructor(maxEntries = MAX_ENTRIES) {
    this.maxEntries = maxEntries
  }

  /**
   * Get a value by key. Returns undefined if missing or expired.
   * Accessing a key updates its LRU timestamp.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }

    // Update LRU timestamp
    entry.lastAccessed = Date.now()
    return entry.value as T
  }

  /**
   * Set a value with a TTL in milliseconds.
   */
  set<T = unknown>(key: string, value: T, ttlMs: number): void {
    // Evict if at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evict()
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccessed: Date.now(),
    })
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.store.get(key)
    if (!entry) return false
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return false
    }
    return true
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.store.delete(key)
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Current number of entries (including potentially expired ones).
   */
  get size(): number {
    return this.store.size
  }

  /**
   * Evict expired entries first, then LRU entries if still over capacity.
   */
  private evict(): void {
    const now = Date.now()

    // Pass 1: remove expired entries
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }

    // Pass 2: if still at capacity, remove least-recently-used entries
    if (this.store.size >= this.maxEntries) {
      const entries = Array.from(this.store.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

      const toRemove = Math.max(1, Math.floor(entries.length * 0.2))
      for (let i = 0; i < toRemove; i++) {
        this.store.delete(entries[i][0])
      }
    }
  }
}

/** Singleton LRU memory cache instance (max 500 entries) */
export const memoryCache = new LRUMemoryCache(MAX_ENTRIES)

export { LRUMemoryCache }
export default memoryCache
