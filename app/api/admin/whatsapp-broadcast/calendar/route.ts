import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import {
  getCalendarData,
  getUpcomingEvents,
  getActiveEvents,
  getCampaignTemplates,
  getCampaignTemplate,
} from "@/lib/whatsapp-broadcast"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/whatsapp-broadcast/calendar
 * Get promotional calendar data.
 *
 * Params:
 *   ?view=upcoming — upcoming events only
 *   ?view=active — active events only
 *   ?view=templates — campaign templates only
 *   ?templateId=xxx — specific template by id/slug
 *   (default) — full calendar data
 */
export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const view = req.nextUrl.searchParams.get("view")
    const templateId = req.nextUrl.searchParams.get("templateId")

    if (view === "upcoming") {
      const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10)
      return NextResponse.json({ events: getUpcomingEvents(days) })
    }

    if (view === "active") {
      return NextResponse.json({ events: getActiveEvents() })
    }

    if (view === "templates") {
      if (templateId) {
        const template = getCampaignTemplate(templateId)
        if (!template) {
          return NextResponse.json({ error: "Template nao encontrado" }, { status: 404 })
        }
        return NextResponse.json({ template })
      }
      return NextResponse.json({ templates: getCampaignTemplates() })
    }

    // Default: full calendar
    return NextResponse.json(getCalendarData())
  } catch (error) {
    logger.error("wa-broadcast.calendar.get-failed", { error })
    return NextResponse.json({ error: "Falha ao carregar calendario" }, { status: 500 })
  }
}
