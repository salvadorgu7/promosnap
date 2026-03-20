import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET() {
  try {
    const blocks = await prisma.editorialBlock.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { position: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        slug: true,
        subtitle: true,
        blockType: true,
        payloadJson: true,
      },
    })

    return NextResponse.json({ blocks }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
    })
  } catch {
    return NextResponse.json({ blocks: [] })
  }
}
