import { NextResponse } from 'next/server'

// Gera code_verifier aleatório (URL-safe base64, 43-128 chars)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Gera code_challenge (SHA-256 do verifier, URL-safe base64)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET() {
  const clientId = process.env.MERCADOLIVRE_APP_ID!
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback'

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  const url = new URL('https://auth.mercadolivre.com.br/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  const response = NextResponse.redirect(url.toString())

  // Armazena o verifier em cookie httpOnly para usar no callback
  response.cookies.set('ml_code_verifier', codeVerifier, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth/ml',
    maxAge: 300, // 5 minutos
  })

  return response
}
