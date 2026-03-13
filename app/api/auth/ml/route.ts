import { NextResponse } from 'next/server'
import { pkceStore, generatePKCE, generateState } from '@/lib/ml-pkce'

export async function GET() {
  const clientId = process.env.MERCADOLIVRE_APP_ID
  const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI || process.env.ML_REDIRECT_URI || (process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback')

  if (!clientId) {
    return NextResponse.json({ error: 'MERCADOLIVRE_APP_ID nao configurado' }, { status: 500 })
  }

  const { verifier, challenge } = generatePKCE()
  const state = generateState()

  // Store verifier keyed by state
  pkceStore.set(state, verifier)

  // Clean old entries (keep max 20)
  if (pkceStore.size > 20) {
    const firstKey = pkceStore.keys().next().value
    if (firstKey) pkceStore.delete(firstKey)
  }

  const url = new URL('https://auth.mercadolivre.com.br/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
