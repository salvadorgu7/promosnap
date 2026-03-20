import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/ml/callback → redireciona para o callback admin unificado.
 * Preserva query params (code, state) para o handler real.
 */
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL || ''
  const qs = req.nextUrl.search // inclui ?code=...&state=...
  return NextResponse.redirect(`${base}/api/admin/ml/callback${qs}`)
}
