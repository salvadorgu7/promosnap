import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const logs = await prisma.emailLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 50,
  })

  const stats = {
    totalSent: await prisma.emailLog.count({ where: { status: 'sent' } }),
    totalFailed: await prisma.emailLog.count({ where: { status: 'failed' } }),
    lastSentAt: logs[0]?.sentAt?.toISOString() ?? null,
  }

  return NextResponse.json({ logs, stats })
}
