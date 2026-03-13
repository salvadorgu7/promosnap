import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runProductionChecks } from '@/lib/production/checks'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const report = await runProductionChecks()
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        score: 0,
        checks: [],
        timestamp: new Date().toISOString(),
        error: 'Falha ao verificar producao',
      },
      { status: 500 }
    )
  }
}
