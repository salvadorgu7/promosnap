import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runFullAudit } from '@/lib/audit/runner'

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
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
