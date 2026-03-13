import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { mlTokenStore } from '@/lib/ml-auth'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/ml/token-check
// Diagnostic endpoint: reads token from DB, shows metadata, tests against ML API
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const results: Record<string, unknown> = {}

  // 1. Check DB for token
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: 'ml_oauth_token' },
    })
    if (row) {
      const token = JSON.parse(row.value)
      const ageMs = Date.now() - (token.obtained_at || 0)
      const expiresMs = (token.expires_in || 0) * 1000

      results.db_token = {
        exists: true,
        user_id: token.user_id,
        has_access_token: !!token.access_token,
        access_token_prefix: token.access_token?.slice(0, 12) + '...',
        has_refresh_token: !!token.refresh_token,
        expires_in: token.expires_in,
        obtained_at: token.obtained_at,
        obtained_at_human: new Date(token.obtained_at).toISOString(),
        age_minutes: Math.round(ageMs / 60000),
        expired: ageMs >= expiresMs,
        time_left_minutes: Math.round((expiresMs - ageMs) / 60000),
        db_updated_at: row.updatedAt,
      }
    } else {
      results.db_token = { exists: false }
    }
  } catch (err) {
    results.db_token = { error: String(err) }
  }

  // 2. Check in-memory cache
  const cached = mlTokenStore.getCached()
  results.cache_token = cached
    ? { exists: true, user_id: cached.user_id, access_token_prefix: cached.access_token?.slice(0, 12) + '...' }
    : { exists: false }

  // 3. Test token against ML API /users/me
  try {
    const token = await mlTokenStore.get()
    if (token?.access_token) {
      const res = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${token.access_token}` },
      })
      const body = await res.text()
      results.ml_users_me = {
        status: res.status,
        ok: res.ok,
        body: body.slice(0, 500),
      }
    } else {
      results.ml_users_me = { skipped: 'no token' }
    }
  } catch (err) {
    results.ml_users_me = { error: String(err) }
  }

  // 4. Test public search (no auth)
  try {
    const res = await fetch(
      'https://api.mercadolibre.com/sites/MLB/search?q=celular&limit=1',
      { headers: { Accept: 'application/json' } }
    )
    const body = await res.text()
    results.ml_public_search = {
      status: res.status,
      ok: res.ok,
      body: body.slice(0, 300),
    }
  } catch (err) {
    results.ml_public_search = { error: String(err) }
  }

  // 5. Test client_credentials app token
  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET
  if (clientId && clientSecret) {
    try {
      const res = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      })
      const body = await res.text()
      results.ml_client_credentials = {
        status: res.status,
        ok: res.ok,
        body: body.slice(0, 300),
      }
    } catch (err) {
      results.ml_client_credentials = { error: String(err) }
    }
  } else {
    results.ml_client_credentials = { skipped: 'missing credentials' }
  }

  // 6. Env vars check (redacted)
  results.env = {
    MERCADOLIVRE_APP_ID: clientId ? clientId.slice(0, 6) + '...' : 'NOT SET',
    MERCADOLIVRE_SECRET: clientSecret ? '***set***' : 'NOT SET',
    MERCADOLIVRE_REDIRECT_URI: process.env.MERCADOLIVRE_REDIRECT_URI || 'NOT SET',
    ML_REDIRECT_URI: process.env.ML_REDIRECT_URI || 'NOT SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
  }

  return NextResponse.json(results, {
    headers: { 'Content-Type': 'application/json' },
  })
}
