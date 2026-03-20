import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/db/redis";

// ============================================
// Sliding Window Rate Limiter
// Backend: Redis when REDIS_URL is set, in-memory fallback otherwise.
// Redis uses simple key counting with TTL (no sliding window overhead).
// ============================================

/** Route type determines the rate limit applied */
export type RateLimitType = "public" | "search" | "clickout" | "alerts" | "newsletter" | "admin";

interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix timestamp (seconds) when the window resets */
  reset: number;
  /** Total allowed per window */
  limit: number;
}

/** Per-key timestamps of requests within the current window */
interface SlidingWindowEntry {
  timestamps: number[];
  lastAccessed: number;
}

// ---- Configuration per route type ----

const RATE_LIMITS: Record<RateLimitType, RateLimitConfig> = {
  public: { maxRequests: 60, windowMs: 60_000 },       // 60 req/min
  search: { maxRequests: 30, windowMs: 60_000 },       // 30 req/min
  clickout: { maxRequests: 120, windowMs: 60_000 },    // 120 req/min
  alerts: { maxRequests: 20, windowMs: 60_000 },       // 20 req/min
  newsletter: { maxRequests: 10, windowMs: 60_000 },   // 10 req/min
  admin: { maxRequests: 30, windowMs: 60_000 },        // 30 req/min (auth-gated)
};

// ---- In-memory store (fallback when Redis is unavailable) ----

const stores = new Map<RateLimitType, Map<string, SlidingWindowEntry>>();

function getStore(type: RateLimitType): Map<string, SlidingWindowEntry> {
  let store = stores.get(type);
  if (!store) {
    store = new Map();
    stores.set(type, store);
  }
  return store;
}

// ---- Automatic cleanup of expired entries ----

const CLEANUP_INTERVAL_MS = 60_000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [type, store] of stores) {
      const config = RATE_LIMITS[type];
      for (const [key, entry] of store) {
        if (now - entry.lastAccessed > config.windowMs * 2) {
          store.delete(key);
        }
      }
    }
  }, CLEANUP_INTERVAL_MS);

  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

// ---- IP extraction helper ----

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

// ---- Redis-backed rate limiting ----

async function rateLimitRedis(ip: string, type: RateLimitType): Promise<RateLimitResult | null> {
  const config = RATE_LIMITS[type];
  const windowSec = Math.ceil(config.windowMs / 1000);
  const windowId = Math.floor(Date.now() / config.windowMs);
  const key = `rl:${type}:${ip}:${windowId}`;

  try {
    const current = await cacheGet<number>(key);
    const count = (current ?? 0) + 1;
    const reset = Math.ceil(((windowId + 1) * config.windowMs) / 1000);

    if (count > config.maxRequests) {
      return { success: false, remaining: 0, reset, limit: config.maxRequests };
    }

    await cacheSet(key, count, windowSec + 1);
    return { success: true, remaining: config.maxRequests - count, reset, limit: config.maxRequests };
  } catch {
    // Redis unavailable — fall through to in-memory
    return null;
  }
}

// ---- In-memory rate limiting ----

function rateLimitMemory(ip: string, type: RateLimitType): RateLimitResult {
  startCleanup();

  const config = RATE_LIMITS[type];
  const store = getStore(type);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [], lastAccessed: now };
    store.set(ip, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
  entry.lastAccessed = now;

  const reset = Math.ceil((now + config.windowMs) / 1000);

  if (entry.timestamps.length >= config.maxRequests) {
    return { success: false, remaining: 0, reset, limit: config.maxRequests };
  }

  entry.timestamps.push(now);
  return { success: true, remaining: config.maxRequests - entry.timestamps.length, reset, limit: config.maxRequests };
}

// ---- Core rate-limit function ----

/**
 * Check and consume a rate-limit token for the given request.
 * Uses Redis when available, falls back to in-memory.
 */
export function rateLimit(req: NextRequest, type: RateLimitType): RateLimitResult {
  const ip = getClientIp(req);

  // Try Redis asynchronously but return in-memory result synchronously
  // (rate limiting must be sync for middleware compatibility)
  // The Redis attempt runs in background to track distributed state
  if (process.env.REDIS_URL) {
    rateLimitRedis(ip, type).catch(() => {});
  }

  return rateLimitMemory(ip, type);
}

// ---- Stats for the admin endpoint ----

export interface RateLimitStats {
  type: RateLimitType;
  config: RateLimitConfig;
  activeKeys: number;
  totalRequestsInWindow: number;
  topClients: Array<{ ip: string; requests: number }>;
}

export function getRateLimitStats(): RateLimitStats[] {
  const now = Date.now();
  const result: RateLimitStats[] = [];

  for (const [type, config] of Object.entries(RATE_LIMITS) as Array<[RateLimitType, RateLimitConfig]>) {
    const store = getStore(type);
    const windowStart = now - config.windowMs;

    let totalRequests = 0;
    const clients: Array<{ ip: string; requests: number }> = [];

    for (const [ip, entry] of store) {
      const active = entry.timestamps.filter((t) => t > windowStart);
      if (active.length > 0) {
        totalRequests += active.length;
        clients.push({ ip, requests: active.length });
      }
    }

    clients.sort((a, b) => b.requests - a.requests);

    result.push({
      type,
      config,
      activeKeys: clients.length,
      totalRequestsInWindow: totalRequests,
      topClients: clients.slice(0, 10),
    });
  }

  return result;
}

// ---- Helper to build a 429 response with rate-limit headers ----

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      retryAfter: result.reset - Math.floor(Date.now() / 1000),
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.reset),
        "Retry-After": String(result.reset - Math.floor(Date.now() / 1000)),
      },
    }
  );
}

/**
 * Adds standard rate-limit headers to an existing response.
 */
export function withRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  return response;
}
