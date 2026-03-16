import { NextRequest, NextResponse } from 'next/server'
import { mlTokenStore } from '@/lib/ml-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const adminPage = `${appUrl}/admin/integrations/ml`

  if (!code) {
    logger.error("ml-auth.missing-code")
    return NextResponse.redirect(`${adminPage}?auth=error&reason=missing_code`)
  }

  // Validate state against cookie (CSRF protection)
  const savedState = req.cookies.get('ml_oauth_state')?.value
  if (!state || !savedState || state !== savedState) {
    logger.error("ml-auth.state-mismatch")
    return NextResponse.redirect(`${adminPage}?auth=error&reason=state_mismatch`)
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET
  const redirectUri =
    process.env.MERCADOLIVRE_REDIRECT_URI ||
    process.env.ML_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback'

  if (!clientId || !clientSecret) {
    logger.error("ml-auth.missing-env-vars")
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
      logger.error("ml-auth.token-exchange-failed", { status: res.status })
      return NextResponse.redirect(`${adminPage}?auth=error&reason=exchange_failed`)
    }

    // Validate token structure
    if (!body.access_token) {
      logger.error("ml-auth.no-access-token")
      return NextResponse.redirect(`${adminPage}?auth=error&reason=no_access_token`)
    }

    // Save token to database + memory cache
    body.obtained_at = Date.now()
    await mlTokenStore.set(body)

    console.log(`[ml-auth] Token obtained, expires_in=${body.expires_in}s, type=${body.token_type}`)

    // Quick validation: test token against ML API
    try {
      const testRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${body.access_token}` },
      })
      console.log('[ml-auth] Token validation /users/me:', testRes.status)
      if (!testRes.ok) {
        const testBody = await testRes.text()
        logger.error("ml-auth.token-validation-failed", { response: testBody.slice(0, 500) })
      }
    } catch (testErr) {
      logger.error("ml-auth.token-validation-exception", { error: testErr })
    }

    // Clear the state cookie and redirect back to admin
    const response = NextResponse.redirect(`${adminPage}?auth=ok`)
    response.cookies.delete('ml_oauth_state')
    return response
  } catch (error) {
    logger.error("ml-auth.callback-failed", { error })
    return NextResponse.redirect(`${adminPage}?auth=error&reason=exception`)
  }
}
