// ML Auth — database-persisted token store (survives Vercel cold starts)

import prisma from '@/lib/db/prisma'

const ML_TOKEN_KEY = 'ml_oauth_token'

interface MLToken {
  access_token: string
  refresh_token: string
  expires_in: number
  obtained_at: number
  user_id?: number
}

// Hybrid store: in-memory cache + database persistence
// - In-memory cache avoids DB reads on every request
// - Database ensures token survives across serverless instances and cold starts
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
      console.log('[ml-auth] Token saved to database')
    } catch (err) {
      console.error('[ml-auth] Failed to save token to DB:', err)
      // Still works in-memory for this instance
    }
  }

  async get(): Promise<MLToken | null> {
    // Return from cache if available
    if (this.cache) return this.cache

    // Otherwise try database
    try {
      const row = await prisma.systemSetting.findUnique({
        where: { key: ML_TOKEN_KEY },
      })
      if (row) {
        this.cache = JSON.parse(row.value) as MLToken
        console.log('[ml-auth] Token loaded from database')
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
    } catch {
      // ignore
    }
  }
}

// Global singleton
const globalForML = globalThis as unknown as { __mlTokenStore?: MLTokenStore }
export const mlTokenStore = globalForML.__mlTokenStore ?? new MLTokenStore()
globalForML.__mlTokenStore = mlTokenStore

async function refreshToken(token: MLToken): Promise<MLToken> {
  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('ML credentials not configured')
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

export async function getMLToken(): Promise<string> {
  const token = await mlTokenStore.get()

  if (!token) {
    throw new Error('ML token not found. Visit /api/auth/ml to authenticate.')
  }

  const ageMs = Date.now() - token.obtained_at
  const expiresMs = token.expires_in * 1000

  // Refresh if within 60s of expiry
  if (ageMs >= expiresMs - 60_000) {
    const fresh = await refreshToken(token)
    return fresh.access_token
  }

  return token.access_token
}
