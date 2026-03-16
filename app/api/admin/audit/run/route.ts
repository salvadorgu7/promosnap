import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runFullAudit } from '@/lib/audit/runner'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const report = await runFullAudit()
    return NextResponse.json(report)
  } catch (error) {
    logger.error("audit-run.failed", { error })
    return NextResponse.json(
      { error: 'Failed to run audit' },
      { status: 500 }
    )
  }
}
