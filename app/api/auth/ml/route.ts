import { NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  const clientId = process.env.MERCADOLIVRE_APP_ID
  const redirectUri =
    process.env.MERCADOLIVRE_REDIRECT_URI ||
    process.env.ML_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback'

  if (!clientId) {
    return NextResponse.json(
      { error: 'MERCADOLIVRE_APP_ID nao configurado' },
      { status: 500 }
    )
  }

  // Generate random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex')

  // Build ML authorization URL (no PKCE — server-side app with client_secret)
  const url = new URL('https://auth.mercadolivre.com.br/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  // Store state in a httpOnly cookie (travels with the browser — no DB, no instance issues)
  const response = NextResponse.redirect(url.toString())
  response.cookies.set('ml_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/auth/ml',
    maxAge: 600, // 10 minutes
  })

  return response
}
