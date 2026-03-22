import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import { getDeliveryHistory, getDeliveryStats, isBroadcastReady } from "@/lib/whatsapp-broadcast"
import { getAllTemplateData } from "@/lib/whatsapp-broadcast/templates"
import type { DeliveryStatus } from "@/lib/whatsapp-broadcast/types"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/whatsapp-broadcast/history
 * Get delivery history and stats.
 *
 * Params:
 *   ?limit=50 — max entries
 *   ?channelId=xxx — filter by channel
 *   ?status=sent|failed|dry_run — filter by status
 *   ?view=stats — return stats only
 *   ?view=templates — return template library
 */
export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const view = req.nextUrl.searchParams.get("view")

    // Stats view
    if (view === "stats") {
      const stats = await getDeliveryStats()
      return NextResponse.json({ stats, broadcastReady: isBroadcastReady() })
    }

    // Template library view
    if (view === "templates") {
      return NextResponse.json({ templates: getAllTemplateData() })
    }

    // History view (default)
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10)
    const channelId = req.nextUrl.searchParams.get("channelId") || undefined
    const status = req.nextUrl.searchParams.get("status") as DeliveryStatus | undefined

    const [history, stats] = await Promise.all([
      getDeliveryHistory(limit, channelId, status),
      getDeliveryStats(),
    ])

    return NextResponse.json({
      history,
      stats,
      broadcastReady: isBroadcastReady(),
    })
  } catch (error) {
    logger.error("wa-broadcast.history.get-failed", { error })
    return NextResponse.json({ error: "Falha ao carregar historico" }, { status: 500 })
  }
}
