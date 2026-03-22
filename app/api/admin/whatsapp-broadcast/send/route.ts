import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import { executeBroadcast, isBroadcastReady, sendTestMessage, getChannel } from "@/lib/whatsapp-broadcast"
import type { MessageStructure, MessageTonality, TimeWindow } from "@/lib/whatsapp-broadcast/types"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/whatsapp-broadcast/send
 * Execute a real broadcast or send a test message.
 */
export async function POST(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json()

    // Test message endpoint
    if (body.action === "test") {
      const channelId = body.channelId
      if (!channelId) {
        return NextResponse.json({ error: "channelId obrigatorio para teste" }, { status: 400 })
      }

      const channel = await getChannel(channelId)
      if (!channel) {
        return NextResponse.json({ error: "Canal nao encontrado" }, { status: 404 })
      }

      if (!isBroadcastReady()) {
        return NextResponse.json({
          success: false,
          error: "WhatsApp API nao configurado",
        })
      }

      const result = await sendTestMessage(channel.destinationId)
      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      })
    }

    // Real broadcast
    const {
      channelId,
      campaignId,
      structure,
      tonality,
      timeWindow,
      offerCount,
    } = body as {
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

    if (!isBroadcastReady()) {
      return NextResponse.json({
        success: false,
        error: "WhatsApp API nao configurado. Configure WHATSAPP_API_URL + WHATSAPP_API_TOKEN.",
      })
    }

    const result = await executeBroadcast({
      channelId,
      campaignId: campaignId || null,
      dryRun: false,
      structure,
      tonality,
      timeWindow,
      offerCount,
    })

    return NextResponse.json({
      success: result.success,
      dryRun: false,
      offerCount: result.offerCount,
      message: result.message?.text || null,
      sendResult: result.sendResult ? {
        success: result.sendResult.success,
        messageId: result.sendResult.messageId,
        error: result.sendResult.error,
      } : null,
      deliveryLog: result.deliveryLog ? {
        id: result.deliveryLog.id,
        status: result.deliveryLog.status,
        sentAt: result.deliveryLog.sentAt,
      } : null,
      fatigueCheck: result.fatigueCheck,
      error: result.error,
    })
  } catch (error) {
    logger.error("wa-broadcast.send.failed", { error })
    return NextResponse.json({ error: "Falha ao enviar broadcast" }, { status: 500 })
  }
}
