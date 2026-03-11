import { NextResponse } from 'next/server'
import { existsSync, readFileSync } from 'fs'
import { ML_TOKEN_PATH } from '@/lib/constants/ml-token-path'

export async function GET() {
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
