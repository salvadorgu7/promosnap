import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { mlTokenStore, getMLAppToken } from '@/lib/ml-auth'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/ml/token-check
// Full diagnostic: token status + search endpoint testing with multiple auth strategies
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
        access_token_prefix: token.access_token?.slice(0, 16) + '...',
        expires_in: token.expires_in,
        age_minutes: Math.round(ageMs / 60000),
        expired: ageMs >= expiresMs,
        time_left_minutes: Math.round((expiresMs - ageMs) / 60000),
      }
    } else {
      results.db_token = { exists: false }
    }
  } catch (err) {
    results.db_token = { error: String(err) }
  }

  // 2. Test /users/me with user token
  const userToken = await mlTokenStore.get()
  if (userToken?.access_token) {
    try {
      const res = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${userToken.access_token}` },
      })
      results.ml_users_me = { status: res.status, ok: res.ok }
    } catch (err) {
      results.ml_users_me = { error: String(err) }
    }
  }

  // 3. Get app token for testing
  let appToken: string | null = null
  try {
    appToken = await getMLAppToken()
    results.app_token = { ok: true, prefix: appToken.slice(0, 16) + '...' }
  } catch (err) {
    results.app_token = { error: String(err) }
  }

  // 4. TEST SEARCH WITH MULTIPLE STRATEGIES
  const searchUrl = 'https://api.mercadolibre.com/sites/MLB/search?q=celular&limit=1'
  const testToken = userToken?.access_token || appToken

  // 4a. Bearer header (current approach)
  if (testToken) {
    try {
      const res = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${testToken}` },
      })
      const body = await res.text()
      results.search_bearer_header = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
    } catch (err) {
      results.search_bearer_header = { error: String(err) }
    }
  }

  // 4b. access_token as query parameter (older ML API format)
  if (testToken) {
    try {
      const res = await fetch(`${searchUrl}&access_token=${testToken}`)
      const body = await res.text()
      results.search_query_param = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
    } catch (err) {
      results.search_query_param = { error: String(err) }
    }
  }

  // 4c. No auth at all
  try {
    const res = await fetch(searchUrl)
    const body = await res.text()
    results.search_no_auth = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
  } catch (err) {
    results.search_no_auth = { error: String(err) }
  }

  // 4d. Try .com.br domain instead of .com
  if (testToken) {
    try {
      const brUrl = 'https://api.mercadolibre.com.br/sites/MLB/search?q=celular&limit=1'
      const res = await fetch(brUrl, {
        headers: { Authorization: `Bearer ${testToken}` },
      })
      const body = await res.text()
      results.search_br_domain = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
    } catch (err) {
      results.search_br_domain = { error: String(err) }
    }
  }

  // 4e. Try /search endpoint directly (without /sites/MLB)
  if (testToken) {
    try {
      const res = await fetch(`https://api.mercadolibre.com/search?q=celular&limit=1&site_id=MLB`, {
        headers: { Authorization: `Bearer ${testToken}` },
      })
      const body = await res.text()
      results.search_alt_endpoint = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
    } catch (err) {
      results.search_alt_endpoint = { error: String(err) }
    }
  }

  // 4f. Try items search (by category popular items)
  if (testToken) {
    try {
      const res = await fetch('https://api.mercadolibre.com/highlights/MLB/category/MLB1055', {
        headers: { Authorization: `Bearer ${testToken}` },
      })
      const body = await res.text()
      results.search_highlights = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
    } catch (err) {
      results.search_highlights = { error: String(err) }
    }
  }

  // 4g. Try trends endpoint
  try {
    const res = await fetch('https://api.mercadolibre.com/trends/MLB', {
      headers: testToken ? { Authorization: `Bearer ${testToken}` } : {},
    })
    const body = await res.text()
    results.search_trends = { status: res.status, ok: res.ok, body: body.slice(0, 200) }
  } catch (err) {
    results.search_trends = { error: String(err) }
  }

  // 5. Env vars (redacted)
  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET
  results.env = {
    MERCADOLIVRE_APP_ID: clientId ? clientId.slice(0, 8) + '...' : 'NOT SET',
    MERCADOLIVRE_SECRET: clientSecret ? '***set***' : 'NOT SET',
    ML_REDIRECT_URI: process.env.ML_REDIRECT_URI || 'NOT SET',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
  }

  return NextResponse.json(results)
}
