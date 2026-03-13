import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { getMLToken } from '@/lib/ml-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/ml/access-token
// Returns the current ML access token for client-side use (admin only)
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const token = await getMLToken()
    return NextResponse.json({ access_token: token })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
