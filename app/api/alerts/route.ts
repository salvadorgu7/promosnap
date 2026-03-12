import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { captureError } from '@/lib/monitoring'

export async function POST(req: NextRequest) {
  // Rate limit: 20 req/min for alerts
  const rl = rateLimit(req, 'alerts')
  if (!rl.success) return rateLimitResponse(rl)
  try {
    const body = await req.json()
    const { listingId, email, targetPrice } = body

    if (!listingId || !email || !targetPrice) {
      return NextResponse.json(
        { error: 'listingId, email e targetPrice sao obrigatorios' },
        { status: 400 }
      )
    }

    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      return NextResponse.json(
        { error: 'targetPrice deve ser um numero positivo' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Email invalido' }, { status: 400 })
    }

    // Check listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    })
    if (!listing) {
      return NextResponse.json({ error: 'Listing nao encontrado' }, { status: 404 })
    }

    // Check for existing active alert
    const existing = await prisma.priceAlert.findFirst({
      where: { listingId, email, isActive: true },
      select: { id: true },
    })
    if (existing) {
      await prisma.priceAlert.update({
        where: { id: existing.id },
        data: { targetPrice },
      })
      return NextResponse.json({ ok: true, updated: true })
    }

    await prisma.priceAlert.create({
      data: { listingId, email, targetPrice },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    await captureError(error, { route: '/api/alerts', method: 'POST' })
    return NextResponse.json(
      { error: 'Falha ao criar alerta. Tente novamente.' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  // Rate limit: 20 req/min for alerts
  const rl = rateLimit(req, 'alerts')
  if (!rl.success) return rateLimitResponse(rl)

  const url = new URL(req.url)
  const email = url.searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Parametro email obrigatorio' }, { status: 400 })
  }

  try {
    const alerts = await prisma.priceAlert.findMany({
      where: { email, isActive: true },
      select: {
        id: true,
        targetPrice: true,
        createdAt: true,
        listing: {
          select: {
            rawTitle: true,
            imageUrl: true,
            source: { select: { name: true, slug: true } },
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

    // Shape response to avoid leaking internal IDs beyond alert id
    const safe = alerts.map((a) => ({
      id: a.id,
      targetPrice: a.targetPrice,
      createdAt: a.createdAt,
      productName: a.listing.rawTitle,
      imageUrl: a.listing.imageUrl,
      sourceName: a.listing.source.name,
      sourceSlug: a.listing.source.slug,
      currentPrice: a.listing.offers[0]?.currentPrice ?? null,
    }))

    return NextResponse.json(safe)
  } catch (error) {
    await captureError(error, { route: '/api/alerts', method: 'GET' })
    return NextResponse.json([], { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  // Rate limit: 20 req/min for alerts
  const rl = rateLimit(req, 'alerts')
  if (!rl.success) return rateLimitResponse(rl)

  const url = new URL(req.url)
  const alertId = url.searchParams.get('id')

  if (!alertId) {
    return NextResponse.json({ error: 'Parametro id obrigatorio' }, { status: 400 })
  }

  try {
    await prisma.priceAlert.update({
      where: { id: alertId },
      data: { isActive: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    await captureError(error, { route: '/api/alerts', method: 'DELETE', alertId })
    return NextResponse.json({ error: 'Alerta nao encontrado' }, { status: 404 })
  }
}
