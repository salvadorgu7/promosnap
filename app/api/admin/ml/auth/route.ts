import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ml/auth
 *
 * Starts the ML OAuth authorization_code flow.
 * Redirects the user to ML login page.
 * After login, ML redirects back to /api/admin/ml/callback with a code.
 *
 * Requires: MERCADOLIVRE_APP_ID + ML_REDIRECT_URI in .env
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const redirectUri = process.env.ML_REDIRECT_URI

  if (!clientId) {
    return NextResponse.json(
      { error: 'MERCADOLIVRE_APP_ID not configured' },
      { status: 500 }
    )
  }

  if (!redirectUri) {
    // Auto-detect redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || 'https://www.promosnap.com.br'

    return NextResponse.json({
      error: 'ML_REDIRECT_URI not configured',
      help: 'Add to .env: ML_REDIRECT_URI=' + baseUrl + '/api/admin/ml/callback',
      steps: [
        `1. Go to https://developers.mercadolivre.com.br/devcenter`,
        `2. Open your app (ID: ${clientId})`,
        `3. Add redirect URI: ${baseUrl}/api/admin/ml/callback`,
        `4. Add ML_REDIRECT_URI=${baseUrl}/api/admin/ml/callback to your .env`,
        `5. Restart the server and try again`,
      ],
    }, { status: 400 })
  }

  // Generate CSRF state token
  const state = randomBytes(32).toString('hex')

  // Build ML authorization URL
  const authUrl = new URL('https://auth.mercadolibre.com.br/authorization')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  // Store state in cookie for validation on callback
  const response = NextResponse.redirect(authUrl.toString())
  response.cookies.set('ml_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/api/admin/ml',
  })

  return response
}
