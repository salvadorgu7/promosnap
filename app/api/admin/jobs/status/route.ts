import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

const JOB_NAMES = ['ingest', 'update-prices', 'compute-scores', 'cleanup', 'sitemap', 'check-alerts']

export async function GET() {
  const statuses = await Promise.all(
    JOB_NAMES.map(async (name) => {
      const lastRun = await prisma.jobRun.findFirst({
        where: { jobName: name },
        orderBy: { startedAt: 'desc' },
      })

      return {
        jobName: name,
        lastStatus: lastRun?.status || null,
        lastRun: lastRun?.startedAt || null,
        durationMs: lastRun?.durationMs || null,
        itemsDone: lastRun?.itemsDone || null,
        itemsTotal: lastRun?.itemsTotal || null,
        errorLog: lastRun?.errorLog || null,
      }
    })
  )

  return NextResponse.json(statuses)
}
