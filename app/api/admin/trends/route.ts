import { NextResponse } from 'next/server'
import { getMLToken } from '@/lib/ml-auth'

interface MLTrend {
  keyword: string
  url: string
}

export async function GET() {
  try {
    const token = await getMLToken()
    const res = await fetch('https://api.mercadolibre.com/trends/MLB', {
      headers: {
        'User-Agent': 'PromoSnap/1.0',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: `ML API ${res.status}` }, { status: 502 })
    }

    const trends: MLTrend[] = await res.json()

    return NextResponse.json({
      count: trends.length,
      keywords: trends.map((t) => t.keyword),
      hint: 'Pesquise essas keywords no mercadolivre.com.br, copie as URLs dos produtos desejados e use POST /api/admin/ingest com os IDs MLB extraídos.',
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
