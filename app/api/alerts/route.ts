import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { listingId, email, targetPrice } = body

    if (!listingId || !email || !targetPrice) {
      return NextResponse.json({ error: 'listingId, email, and targetPrice are required' }, { status: 400 })
    }

    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      return NextResponse.json({ error: 'targetPrice must be a positive number' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Check listing exists
    const listing = await prisma.listing.findUnique({ where: { id: listingId } })
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Check for existing active alert
    const existing = await prisma.priceAlert.findFirst({
      where: { listingId, email, isActive: true },
    })
    if (existing) {
      // Update target price
      const updated = await prisma.priceAlert.update({
        where: { id: existing.id },
        data: { targetPrice },
      })
      return NextResponse.json({ ok: true, alert: updated, updated: true })
    }

    const alert = await prisma.priceAlert.create({
      data: { listingId, email, targetPrice },
    })

    return NextResponse.json({ ok: true, alert })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create alert' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const email = url.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email param required' }, { status: 400 })
  }

  const alerts = await prisma.priceAlert.findMany({
    where: { email, isActive: true },
    include: {
      listing: {
        select: {
          id: true,
          rawTitle: true,
          imageUrl: true,
          productUrl: true,
          source: { select: { name: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            take: 1,
            select: { currentPrice: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(alerts)
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const alertId = url.searchParams.get('id')

  if (!alertId) {
    return NextResponse.json({ error: 'id param required' }, { status: 400 })
  }

  await prisma.priceAlert.update({
    where: { id: alertId },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true })
}
