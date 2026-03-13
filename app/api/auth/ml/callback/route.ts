import { NextRequest, NextResponse } from 'next/server'
import { mlTokenStore } from '@/lib/ml-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const adminPage = `${appUrl}/admin/integrations/ml`

  if (!code) {
    console.error('[ml-auth] Callback missing code param')
    return NextResponse.redirect(`${adminPage}?auth=error&reason=missing_code`)
  }

  // Validate state against cookie (CSRF protection)
  const savedState = req.cookies.get('ml_oauth_state')?.value
  if (!state || !savedState || state !== savedState) {
    console.error('[ml-auth] State mismatch', { received: state, saved: savedState })
    return NextResponse.redirect(`${adminPage}?auth=error&reason=state_mismatch`)
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET
  const redirectUri =
    process.env.MERCADOLIVRE_REDIRECT_URI ||
    process.env.ML_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback'

  if (!clientId || !clientSecret) {
    console.error('[ml-auth] Missing env vars')
    return NextResponse.redirect(`${adminPage}?auth=error&reason=missing_env`)
  }

  try {
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

    const body = await res.json()

    if (!res.ok) {
      console.error('[ml-auth] Token exchange failed:', res.status, JSON.stringify(body))
      return NextResponse.redirect(`${adminPage}?auth=error&reason=exchange_failed`)
    }

    // Save token to database + memory cache
    body.obtained_at = Date.now()
    await mlTokenStore.set(body)

    console.log('[ml-auth] Token obtained successfully, user_id:', body.user_id, 'expires_in:', body.expires_in)

    // Clear the state cookie and redirect back to admin
    const response = NextResponse.redirect(`${adminPage}?auth=ok`)
    response.cookies.delete('ml_oauth_state')
    return response
  } catch (error) {
    console.error('[ml-auth] Callback exception:', error)
    return NextResponse.redirect(`${adminPage}?auth=error&reason=exception`)
  }
}
