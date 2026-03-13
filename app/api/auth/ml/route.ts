import { redirect } from 'next/navigation'

export async function GET() {
  const clientId = process.env.MERCADOLIVRE_APP_ID
  const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI || process.env.ML_REDIRECT_URI || (process.env.NEXT_PUBLIC_APP_URL + '/api/auth/ml/callback')

  const url = new URL('https://auth.mercadolivre.com.br/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId!)
  url.searchParams.set('redirect_uri', redirectUri)

  redirect(url.toString())
}
