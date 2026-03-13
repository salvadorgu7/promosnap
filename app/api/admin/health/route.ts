import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runAllHealthChecks } from '@/lib/health/checks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const report = await runAllHealthChecks()
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: 'Falha ao executar health checks',
      },
      { status: 500 }
    )
  }
}
