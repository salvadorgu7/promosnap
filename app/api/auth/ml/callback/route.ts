import { NextRequest, NextResponse } from 'next/server'
import { mlTokenStore } from '@/lib/ml-auth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')

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
      console.error('[ml-auth] Token exchange failed:', JSON.stringify(body))
      return NextResponse.json(
        {
          error: 'Token exchange failed',
          ml_response: body,
          ml_status: res.status,
          params_sent: {
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: '***' + clientSecret.slice(-4),
            code: code.slice(0, 10) + '...',
            redirect_uri: redirectUri,
          },
        },
        { status: 500 }
      )
    }

    // Save token in memory store
    body.obtained_at = Date.now()
    mlTokenStore.set(body)

    console.log('[ml-auth] Token obtained successfully, expires_in:', body.expires_in)

    return NextResponse.json({
      ok: true,
      expires_in: body.expires_in,
      user_id: body.user_id,
    })
  } catch (error) {
    console.error('[ml-auth] Callback error:', error)
    return NextResponse.json(
      { error: 'Falha na autenticacao ML', detail: String(error) },
      { status: 500 }
    )
  }
}
