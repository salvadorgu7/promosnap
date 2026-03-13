import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { MercadoLivreSourceAdapter } from '@/lib/adapters/mercadolivre'

export const dynamic = 'force-dynamic'

const ml = new MercadoLivreSourceAdapter()

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const query = req.nextUrl.searchParams.get('q')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
  const page = parseInt(req.nextUrl.searchParams.get('page') || '0')

  if (!query) {
    return NextResponse.json({ error: 'Parametro q obrigatorio' }, { status: 400 })
  }

  const results = await ml.search(query, { limit, page })

  return NextResponse.json({
    query,
    count: results.length,
    results,
  })
}
