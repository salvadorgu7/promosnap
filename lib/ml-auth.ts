import { readFile, writeFile } from 'fs/promises'
import path from 'path'

interface MLToken {
  access_token: string
  refresh_token: string
  expires_in: number
  obtained_at: number
}

const TOKEN_PATH = path.join(process.cwd(), '.ml-token.json')

async function readToken(): Promise<MLToken | null> {
  try {
    const raw = await readFile(TOKEN_PATH, 'utf-8')
    return JSON.parse(raw) as MLToken
  } catch {
    return null
  }
}

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
    throw new Error(`ML token refresh failed: ${res.status} ${res.statusText}`)
  }

  const fresh = await res.json()
  fresh.obtained_at = Date.now()

  await writeFile(TOKEN_PATH, JSON.stringify(fresh, null, 2), 'utf-8')
  return fresh as MLToken
}

export async function getMLToken(): Promise<string> {
  const token = await readToken()

  if (!token) {
    throw new Error('ML token not found. Visit /api/auth/ml to authenticate.')
  }

  const ageMs = Date.now() - token.obtained_at
  const expiresMs = token.expires_in * 1000

  if (ageMs >= expiresMs - 60_000) {
    const fresh = await refreshToken(token)
    return fresh.access_token
  }

  return token.access_token
}
