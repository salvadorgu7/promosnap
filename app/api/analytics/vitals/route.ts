import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, value, id, page } = body

    // Log Web Vital metric
    logger.info('web-vital', {
      metric: name,
      value: Math.round(value),
      id,
      page,
      userAgent: req.headers.get('user-agent')?.slice(0, 100),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
