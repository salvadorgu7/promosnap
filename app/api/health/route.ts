import { NextResponse } from 'next/server'
import { runAllHealthChecks } from '@/lib/health/checks'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const report = await runAllHealthChecks()
    return NextResponse.json({
      status: report.status,
      timestamp: report.timestamp,
    })
  } catch {
    return NextResponse.json(
      { status: 'critical', timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}
