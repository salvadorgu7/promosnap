import { NextRequest, NextResponse } from 'next/server'
import { generateDailyBriefing, GROWTH_AGENTS, getAgentScorecard } from '@/lib/growth/command-center'
import { getCalendarOverview } from '@/lib/growth/promo-calendar'

/**
 * GET /api/admin/growth/command-center
 * Growth Command Center API — daily briefing, calendar, agents.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const section = req.nextUrl.searchParams.get('section') || 'briefing'

  switch (section) {
    case 'briefing': {
      const briefing = await generateDailyBriefing()
      return NextResponse.json(briefing)
    }

    case 'calendar': {
      const calendar = getCalendarOverview()
      return NextResponse.json(calendar)
    }

    case 'agents': {
      const scorecards = await Promise.all(
        GROWTH_AGENTS.map(async a => ({
          ...a,
          scorecard: await getAgentScorecard(a.name),
        }))
      )
      return NextResponse.json({ agents: scorecards })
    }

    default:
      return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 })
  }
}
