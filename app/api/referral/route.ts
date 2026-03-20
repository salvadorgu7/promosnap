import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { randomBytes } from 'crypto'

// POST — create or get referral by email
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    // Check if referral already exists for this email
    let referral = await prisma.referral.findFirst({
      where: { email },
    })

    if (!referral) {
      const code = randomBytes(4).toString('hex')
      referral = await prisma.referral.create({
        data: { code, email },
      })
    }

    return NextResponse.json({
      code: referral.code,
      visits: referral.visits,
      clickouts: referral.clickouts,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
  }
}

// GET — get stats by code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  const referral = await prisma.referral.findUnique({ where: { code } })
  if (!referral) {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }

  return NextResponse.json({
    code: referral.code,
    visits: referral.visits,
    clickouts: referral.clickouts,
  })
}

// PATCH — increment visits or clickouts
export async function PATCH(req: NextRequest) {
  try {
    const { code, type } = await req.json()
    if (!code || !['visit', 'clickout'].includes(type)) {
      return NextResponse.json({ error: 'code and type (visit|clickout) required' }, { status: 400 })
    }

    const referral = await prisma.referral.update({
      where: { code },
      data: {
        [type === 'visit' ? 'visits' : 'clickouts']: { increment: 1 },
      },
    })

    return NextResponse.json({ ok: true, visits: referral.visits, clickouts: referral.clickouts })
  } catch {
    return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
  }
}
