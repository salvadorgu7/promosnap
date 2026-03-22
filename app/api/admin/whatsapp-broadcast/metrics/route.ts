import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import { getMetricsDashboard, computeKPIs } from "@/lib/whatsapp-broadcast"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/whatsapp-broadcast/metrics
 * Get revenue analytics, KPIs, scorecards, and alerts.
 *
 * Params:
 *   ?view=kpis — raw KPIs only
 *   ?view=alerts — alerts only
 *   ?view=campaigns — campaign scorecards only
 *   ?view=templates — template scorecards only
 *   (default) — full dashboard
 */
export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const view = req.nextUrl.searchParams.get("view")

    if (view === "kpis") {
      const kpis = await computeKPIs()
      return NextResponse.json({ kpis })
    }

    if (view === "alerts") {
      const kpis = await computeKPIs()
      return NextResponse.json({ alerts: kpis.alerts })
    }

    if (view === "campaigns") {
      const kpis = await computeKPIs()
      return NextResponse.json({ campaigns: kpis.campaignScoreboards })
    }

    if (view === "templates") {
      const kpis = await computeKPIs()
      return NextResponse.json({ templates: kpis.templateScoreboards })
    }

    // Default: full dashboard
    return NextResponse.json(await getMetricsDashboard())
  } catch (error) {
    logger.error("wa-broadcast.metrics.get-failed", { error })
    return NextResponse.json({ error: "Falha ao carregar metricas" }, { status: 500 })
  }
}
