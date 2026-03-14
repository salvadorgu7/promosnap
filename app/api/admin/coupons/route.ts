import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/coupons — list all coupons
 * POST /api/admin/coupons — create or upsert a coupon
 *   Body: { code, description?, sourceSlug?, endAt?, rulesJson? }
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const coupons = await prisma.coupon.findMany({
    include: { source: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ coupons })
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let body: {
    code: string
    description?: string
    sourceSlug?: string
    endAt?: string
    rulesJson?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  // Find source if sourceSlug provided
  let sourceId: string | null = null
  if (body.sourceSlug) {
    const source = await prisma.source.findUnique({ where: { slug: body.sourceSlug } })
    if (source) sourceId = source.id
  }

  // Upsert by code
  const existing = await prisma.coupon.findFirst({ where: { code: body.code } })

  if (existing) {
    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        description: body.description ?? existing.description,
        sourceId: sourceId ?? existing.sourceId,
        endAt: body.endAt ? new Date(body.endAt) : existing.endAt,
        rulesJson: (body.rulesJson ?? existing.rulesJson ?? undefined) as Prisma.InputJsonValue | undefined,
        status: 'ACTIVE',
      },
    })
    return NextResponse.json({ action: 'updated', coupon: updated })
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: body.code,
      description: body.description ?? null,
      sourceId,
      endAt: body.endAt ? new Date(body.endAt) : null,
      rulesJson: (body.rulesJson ?? undefined) as Prisma.InputJsonValue | undefined,
      status: 'ACTIVE',
    },
  })

  return NextResponse.json({ action: 'created', coupon })
}
