import { NextRequest, NextResponse } from 'next/server'
import { runAllHealthChecks } from '@/lib/health/checks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const report = await runAllHealthChecks()
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
