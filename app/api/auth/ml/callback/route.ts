import { NextRequest, NextResponse } from 'next/server'
import { mlTokenStore } from '@/lib/ml-auth'
import { pkceStore } from '@/lib/ml-pkce'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET
  const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI || process.env.ML_REDIRECT_URI || (process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback')

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'MERCADOLIVRE_APP_ID ou MERCADOLIVRE_SECRET nao configurados' },
      { status: 500 }
    )
  }

  // Get code_verifier from PKCE store (database-persisted)
  const codeVerifier = state ? await pkceStore.get(state) : undefined
  if (state) await pkceStore.delete(state) // one-time use

  try {
    const params: Record<string, string> = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }

    // Add code_verifier if PKCE was used
    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    })

    const body = await res.json()

    if (!res.ok) {
      console.error('[ml-auth] Token exchange failed:', JSON.stringify(body), { ml_status: res.status, pkce_used: !!codeVerifier, redirect_uri: redirectUri })
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: 500 }
      )
    }

    // Save token to database + memory cache
    body.obtained_at = Date.now()
    await mlTokenStore.set(body)

    console.log('[ml-auth] Token obtained successfully, expires_in:', body.expires_in)

    // Redirect back to admin ML page with success indicator
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    return NextResponse.redirect(`${appUrl}/admin/integrations/ml?auth=ok`)
  } catch (error) {
    console.error('[ml-auth] Callback error:', error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    return NextResponse.redirect(`${appUrl}/admin/integrations/ml?auth=error`)
  }
}
