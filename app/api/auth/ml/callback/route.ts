import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { ML_TOKEN_PATH } from '@/lib/constants/ml-token-path'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const codeVerifier = req.cookies.get('ml_code_verifier')?.value
  if (!codeVerifier) {
    return NextResponse.json({ error: 'Missing code_verifier cookie — reinicie o fluxo em /api/auth/ml' }, { status: 400 })
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID!
  const clientSecret = process.env.MERCADOLIVRE_SECRET!
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback'

  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: 'Token exchange failed', detail: err }, { status: 500 })
  }

  const token = await res.json()
  token.obtained_at = Date.now()

  console.log('[ml-auth] saving ML token to:', ML_TOKEN_PATH)
  await writeFile(ML_TOKEN_PATH, JSON.stringify(token, null, 2), 'utf-8')

  // Limpa o cookie do verifier
  const response = NextResponse.json({ ok: true, expires_in: token.expires_in })
  response.cookies.delete('ml_code_verifier')
  return response
}
