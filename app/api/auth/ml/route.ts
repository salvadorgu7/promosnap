import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/ml → redireciona para o fluxo admin unificado.
 * O fluxo OAuth agora vive em /api/admin/ml/auth (com validação admin).
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL || ''
  return NextResponse.redirect(`${base}/api/admin/ml/auth`)
}
