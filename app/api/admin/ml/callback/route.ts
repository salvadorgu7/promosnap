import { NextRequest, NextResponse } from 'next/server'
import { mlTokenStore } from '@/lib/ml-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ml/callback?code=...
 *
 * OAuth callback from Mercado Livre.
 * Exchanges the authorization code for a user access_token + refresh_token.
 * Stores in DB for persistent use across sessions.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    return NextResponse.json(
      { error: 'ML OAuth denied', detail: error },
      { status: 403 }
    )
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    )
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'ML credentials or redirect URI not configured' },
      { status: 500 }
    )
  }

  try {
    // Exchange code for tokens
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[ml-callback] Token exchange failed:', res.status, errText)
      return NextResponse.json(
        { error: 'Token exchange failed', status: res.status, detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const tokenData = await res.json()

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: 'No access_token in response', data: tokenData },
        { status: 502 }
      )
    }

    // Store token in DB
    await mlTokenStore.set({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in || 21600,
      obtained_at: Date.now(),
      user_id: tokenData.user_id,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    })

    // Test the token immediately
    let testResult = 'not tested'
    try {
      const testRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (testRes.ok) {
        const user = await testRes.json()
        testResult = `OK — ${user.nickname} (${user.id})`
      } else {
        testResult = `Failed: ${testRes.status}`
      }
    } catch { testResult = 'error' }

    // Test search access
    let searchResult = 'not tested'
    try {
      const searchRes = await fetch('https://api.mercadolibre.com/sites/MLB/search?q=celular&limit=1', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (searchRes.ok) {
        const data = await searchRes.json()
        searchResult = `OK — ${data.paging?.total || 0} results`
      } else {
        searchResult = `Failed: ${searchRes.status}`
      }
    } catch { searchResult = 'error' }

    // Show success page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const html = `<!DOCTYPE html>
<html><head><title>ML OAuth — Sucesso!</title>
<style>
  body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 0 20px; background: #f8f9fa; }
  .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  h1 { color: #059669; font-size: 24px; }
  .test { background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .test.warn { background: #fffbeb; }
  code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
  a { color: #2563eb; }
</style></head>
<body>
<div class="card">
  <h1>✅ ML OAuth conectado!</h1>
  <p>Token de usuario salvo com sucesso.</p>
  <div class="test">
    <strong>User ID:</strong> ${tokenData.user_id || 'N/A'}<br>
    <strong>/users/me:</strong> ${testResult}<br>
    <strong>/search:</strong> ${searchResult}<br>
    <strong>Expires in:</strong> ${Math.round((tokenData.expires_in || 0) / 3600)}h
  </div>
  <p>Agora rode:</p>
  <pre><code>npm run import:real</code></pre>
  <p>Os produtos reais do ML vao ser importados usando seu token de usuario.</p>
  ${baseUrl ? `<p><a href="${baseUrl}">← Voltar ao PromoSnap</a></p>` : ''}
</div>
</body></html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })

  } catch (err) {
    console.error('[ml-callback] Error:', err)
    return NextResponse.json(
      { error: 'Callback processing failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
