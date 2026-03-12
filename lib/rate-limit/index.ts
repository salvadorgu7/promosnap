/**
 * Simple in-memory rate limiter for PromoSnap API routes.
 *
 * Uses a sliding window approach with configurable window size and max requests.
 * Designed for single-instance deployments; for multi-instance, use Redis-backed rate limiting.
 */

export interface RateLimitConfig {
  /** Window size in milliseconds (default: 60_000 = 1 minute) */
  windowMs: number;
  /** Maximum requests allowed per window (default: 60) */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  totalHits: number;
}

interface WindowEntry {
  timestamps: number[];
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

export class RateLimiter {
  private config: RateLimitConfig;
  private store = new Map<string, WindowEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Periodic cleanup of expired entries
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(
        () => this.cleanup(),
        this.config.windowMs * 2
      );
      // Allow the process to exit without waiting for this interval
      if (this.cleanupInterval && "unref" in this.cleanupInterval) {
        (this.cleanupInterval as NodeJS.Timeout).unref();
      }
    }
  }

  /**
   * Check rate limit for a given key (e.g., IP address).
   * Returns whether the request is allowed and how many requests remain.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.store.set(key, entry);
    }

    // Remove timestamps outside the window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    const totalHits = entry.timestamps.length;
    const allowed = totalHits < this.config.maxRequests;

    if (allowed) {
      entry.timestamps.push(now);
    }

    const remaining = Math.max(0, this.config.maxRequests - entry.timestamps.length);
    const resetAt = entry.timestamps.length > 0
      ? entry.timestamps[0] + this.config.windowMs
      : now + this.config.windowMs;

    return {
      allowed,
      remaining,
      resetAt,
      totalHits: entry.timestamps.length,
    };
  }

  /**
   * Reset rate limit for a given key.
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries from the store.
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, entry] of this.store) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      if (entry.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and clear the cleanup interval.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /**
   * Get the current number of tracked keys.
   */
  get size(): number {
    return this.store.size;
  }
}

// ── Singleton instances for common use cases ──

const globalForRateLimit = globalThis as unknown as {
  _apiLimiter?: RateLimiter;
  _searchLimiter?: RateLimiter;
};

/** General API rate limiter: 60 requests per minute */
export const apiLimiter =
  globalForRateLimit._apiLimiter ??
  (globalForRateLimit._apiLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 60,
  }));

/** Search-specific rate limiter: 30 requests per minute */
export const searchLimiter =
  globalForRateLimit._searchLimiter ??
  (globalForRateLimit._searchLimiter = new RateLimiter({
    windowMs: 60_000,
    maxRequests: 30,
  }));
