import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { findDuplicateCandidates, mergeDuplicates } from '@/lib/catalog/dedup'

function checkAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  const expected = process.env.ADMIN_SECRET
  if (!expected || !secret) return false
  return createHash('sha256').update(secret).digest('hex') === createHash('sha256').update(expected).digest('hex')
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pairs = await findDuplicateCandidates(50)
  return NextResponse.json({
    ok: true,
    count: pairs.length,
    pairs,
    autoMergeable: pairs.filter(p => p.similarity >= 0.95).length,
  })
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { primaryId, duplicateIds } = await req.json()
  if (!primaryId || !Array.isArray(duplicateIds)) {
    return NextResponse.json({ error: 'primaryId and duplicateIds[] required' }, { status: 400 })
  }

  const result = await mergeDuplicates(primaryId, duplicateIds)
  return NextResponse.json({ ok: true, ...result })
}
