// ML Auth — multi-strategy token management
// Priority: 1) OAuth user token (DB) → 2) App token (client_credentials)

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const ML_TOKEN_KEY = 'ml_oauth_token'

interface MLToken {
  access_token: string
  refresh_token?: string
  expires_in: number
  obtained_at: number
  user_id?: number
  token_type?: string
  scope?: string
}

// ============================================================================
// OAuth user token store (DB-persisted)
// ============================================================================

class MLTokenStore {
  private cache: MLToken | null = null

  /** Sync cache-only check (for status display, no DB hit) */
  getCached(): MLToken | null {
    return this.cache
  }

  async set(token: MLToken) {
    this.cache = token
    try {
      await prisma.systemSetting.upsert({
        where: { key: ML_TOKEN_KEY },
        create: { key: ML_TOKEN_KEY, value: JSON.stringify(token) },
        update: { value: JSON.stringify(token) },
      })
      // Token persisted to DB
    } catch (err) {
      console.error('[ml-auth] Failed to save token to DB:', err)
    }
  }

  async get(): Promise<MLToken | null> {
    if (this.cache) return this.cache

    try {
      const row = await prisma.systemSetting.findUnique({
        where: { key: ML_TOKEN_KEY },
      })
      if (row) {
        this.cache = JSON.parse(row.value) as MLToken
        return this.cache
      }
    } catch (err) {
      console.error('[ml-auth] Failed to read token from DB:', err)
    }

    return null
  }

  async clear() {
    this.cache = null
    try {
      await prisma.systemSetting.deleteMany({ where: { key: ML_TOKEN_KEY } })
    } catch (err) {
      logger.warn("ml-auth.clear-failed", { error: err })
    }
  }
}

const globalForML = globalThis as unknown as { __mlTokenStore?: MLTokenStore }
export const mlTokenStore = globalForML.__mlTokenStore ?? new MLTokenStore()
globalForML.__mlTokenStore = mlTokenStore

// ============================================================================
// App token via client_credentials (no user auth needed)
// ============================================================================

let appTokenCache: { token: string; expiresAt: number } | null = null

/**
 * Get an app-level access token via client_credentials grant.
 * Cached in-memory with expiry. No DB needed — it's cheap to regenerate.
 */
export async function getMLAppToken(): Promise<string> {
  // Return cached if still valid (with 60s margin)
  if (appTokenCache && Date.now() < appTokenCache.expiresAt - 60_000) {
    return appTokenCache.token
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('ML credentials not configured (MERCADOLIVRE_APP_ID / MERCADOLIVRE_SECRET)')
  }

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML client_credentials failed: ${res.status} — ${err}`)
  }

  const data = await res.json()

  if (!data.access_token) {
    throw new Error('ML client_credentials returned no access_token')
  }

  appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 21600) * 1000,
  }

  console.log(`[ml-auth] App token obtained, expires_in=${data.expires_in}s`)
  return data.access_token
}

// ============================================================================
// Unified token getter: user token → app token
// ============================================================================

async function refreshUserToken(token: MLToken): Promise<MLToken> {
  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET

  if (!clientId || !clientSecret || !token.refresh_token) {
    throw new Error('Cannot refresh — missing credentials or refresh_token')
  }

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token refresh failed: ${res.status} — ${err}`)
  }

  const fresh = await res.json()
  fresh.obtained_at = Date.now()

  await mlTokenStore.set(fresh)
  return fresh as MLToken
}

/**
 * Get a valid ML access token. Tries (in order):
 * 1. OAuth user token from DB (refresh if expired)
 * 2. App token via client_credentials
 *
 * Never throws — always returns a token or throws with clear message.
 */
export async function getMLToken(): Promise<string> {
  // Try 1: OAuth user token
  try {
    const token = await mlTokenStore.get()
    if (token) {
      const ageMs = Date.now() - token.obtained_at
      const expiresMs = token.expires_in * 1000

      if (ageMs < expiresMs - 60_000) {
        return token.access_token
      }

      // Try refresh
      try {
        const fresh = await refreshUserToken(token)
        return fresh.access_token
      } catch (refreshErr) {
        console.warn('[ml-auth] User token refresh failed, falling back to app token:', refreshErr)
      }
    }
  } catch (dbErr) {
    console.warn('[ml-auth] User token read failed:', dbErr)
  }

  // Try 2: App token (client_credentials)
  return getMLAppToken()
}
