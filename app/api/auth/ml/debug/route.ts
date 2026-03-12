import { NextRequest, NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'fs'
import { ML_TOKEN_PATH } from '@/lib/constants/ml-token-path'

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (secret) {
    const url = new URL(req.url)
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}` && url.searchParams.get('secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  const exists = existsSync(ML_TOKEN_PATH)

  let masked: string | null = null
  if (exists) {
    try {
      const raw = JSON.parse(readFileSync(ML_TOKEN_PATH, 'utf-8'))
      const t = raw.access_token as string
      masked = t.length > 8 ? `${t.slice(0, 4)}...${t.slice(-4)}` : '****'
    } catch {
      masked = '(parse error)'
    }
  }

  return NextResponse.json({
    cwd: process.cwd(),
    tokenPath: ML_TOKEN_PATH,
    exists,
    accessToken: masked,
  })
}
