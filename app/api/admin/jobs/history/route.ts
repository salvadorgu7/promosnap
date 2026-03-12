import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const jobName = url.searchParams.get('job') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

  const where: any = {}
  if (jobName) where.jobName = jobName

  const runs = await prisma.jobRun.findMany({
    where,
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  return NextResponse.json(runs)
}
