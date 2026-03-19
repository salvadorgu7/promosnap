import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runAllHealthChecks } from '@/lib/health/checks'
import { checkEnvironment } from '@/lib/config/assert-env'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const report = await runAllHealthChecks()
    const envCheck = checkEnvironment()

    return NextResponse.json({
      ...report,
      envReadiness: {
        ok: envCheck.ok,
        environment: envCheck.environment,
        missing: envCheck.missing,
        validationErrors: envCheck.validationErrors,
        warnings: envCheck.warnings.length,
      },
    })
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
