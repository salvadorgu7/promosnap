// ML Auth — in-memory token store (Vercel-compatible, no filesystem)

interface MLToken {
  access_token: string
  refresh_token: string
  expires_in: number
  obtained_at: number
  user_id?: number
}

// In-memory token store (survives within a single serverless instance)
// For production persistence, migrate to database or Vercel KV
class MLTokenStore {
  private token: MLToken | null = null

  set(token: MLToken) {
    this.token = token
    console.log('[ml-auth] Token stored in memory')
  }

  get(): MLToken | null {
    return this.token
  }

  clear() {
    this.token = null
  }
}

// Global singleton — survives across requests in the same serverless instance
const globalForML = globalThis as unknown as { __mlTokenStore?: MLTokenStore }
export const mlTokenStore = globalForML.__mlTokenStore ?? new MLTokenStore()
globalForML.__mlTokenStore = mlTokenStore

async function refreshToken(token: MLToken): Promise<MLToken> {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.MERCADOLIVRE_APP_ID!,
      client_secret: process.env.MERCADOLIVRE_SECRET!,
      refresh_token: token.refresh_token,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ML token refresh failed: ${res.status} — ${err}`)
  }

  const fresh = await res.json()
  fresh.obtained_at = Date.now()

  mlTokenStore.set(fresh)
  return fresh as MLToken
}

export async function getMLToken(): Promise<string> {
  const token = mlTokenStore.get()

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
