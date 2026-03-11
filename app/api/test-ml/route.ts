import { NextResponse } from 'next/server'
import { getMLToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

async function mlGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PromoSnap/1.0',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : (await res.text()).slice(0, 300)
  return { status: res.status, body }
}

// IDs reais extraídos do ML search
const TEST_IDS = [
  'MLB4268306121', 'MLB4256048237', 'MLB3571995199',
  'MLB4109922109', 'MLB4435006243',
]

export async function GET() {
  try {
    const token = await getMLToken()

    const [single, multi] = await Promise.all([
      mlGet(`${ML_API}/items/${TEST_IDS[0]}`, token),
      mlGet(`${ML_API}/items?ids=${TEST_IDS.join(',')}`, token),
    ])

    return NextResponse.json({ single, multi })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
