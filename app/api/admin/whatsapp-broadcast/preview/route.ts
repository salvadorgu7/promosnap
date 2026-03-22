import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import { executeBroadcast } from "@/lib/whatsapp-broadcast"
import type { MessageStructure, MessageTonality, TimeWindow } from "@/lib/whatsapp-broadcast/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/whatsapp-broadcast/preview
 * Generate a preview (dry-run) of a broadcast message.
 * Does NOT send anything — just shows what would be sent.
 */
export async function POST(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { channelId, campaignId, structure, tonality, timeWindow, offerCount } = body as {
      channelId: string
      campaignId?: string
      structure?: MessageStructure
      tonality?: MessageTonality
      timeWindow?: TimeWindow
      offerCount?: number
    }

    if (!channelId) {
      return NextResponse.json({ error: "channelId obrigatorio" }, { status: 400 })
    }

    const result = await executeBroadcast({
      channelId,
      campaignId: campaignId || null,
      dryRun: true,
      structure,
      tonality,
      timeWindow,
      offerCount,
    })

    return NextResponse.json({
      success: result.success,
      preview: {
        text: result.message?.text || null,
        structure: result.message?.structure || null,
        opening: result.message?.opening || null,
        cta: result.message?.cta || null,
        templateKey: result.message?.templateKey || null,
        offerCount: result.offerCount,
        offers: result.message?.offers.map(o => ({
          offerId: o.offerId,
          productName: o.productName,
          currentPrice: o.currentPrice,
          originalPrice: o.originalPrice,
          discount: o.discount,
          sourceName: o.sourceName,
          affiliateUrl: o.affiliateUrl,
          position: o.position,
        })) || [],
      },
      channel: {
        id: result.channel?.id,
        name: result.channel?.name,
        groupType: result.channel?.groupType,
      },
      campaign: result.campaign ? {
        id: result.campaign.id,
        name: result.campaign.name,
      } : null,
      fatigueCheck: result.fatigueCheck,
      error: result.error,
    })
  } catch (error) {
    logger.error("wa-broadcast.preview.failed", { error })
    return NextResponse.json({ error: "Falha ao gerar preview" }, { status: 500 })
  }
}
