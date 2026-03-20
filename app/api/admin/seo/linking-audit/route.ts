import { NextRequest, NextResponse } from 'next/server'
import { computeLinkHealth } from '@/lib/seo/link-optimizer'
import { createHash } from 'crypto'

export async function GET(req: NextRequest) {
  // Admin auth
  const secret = req.headers.get('x-admin-secret')
  const expected = process.env.ADMIN_SECRET
  if (expected && (!secret || createHash('sha256').update(secret).digest('hex') !== createHash('sha256').update(expected).digest('hex'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const health = await computeLinkHealth()

    return NextResponse.json({
      ok: true,
      health,
      summary: {
        score: health.score,
        totalPages: health.totalPages,
        orphanPages: health.orphanPages,
        clusterCoverage: `${health.clusterCoverage}%`,
        criticalIssues: health.gaps.filter(g => g.severity === 'critical').length,
        warnings: health.gaps.filter(g => g.severity === 'warning').length,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to compute link health' }, { status: 500 })
  }
}
