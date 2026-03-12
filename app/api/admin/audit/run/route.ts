import { NextRequest, NextResponse } from 'next/server'
import { runFullAudit } from '@/lib/audit/runner'

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-admin-secret')
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await runFullAudit()

    return NextResponse.json(report)
  } catch (error) {
    console.error('[api/admin/audit/run] error:', error)
    return NextResponse.json(
      { error: 'Failed to run audit', details: error instanceof Error ? error.message : 'unknown' },
      { status: 500 }
    )
  }
}
