import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import {
  getAllChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getCampaignsForChannel,
} from "@/lib/whatsapp-broadcast"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/whatsapp-broadcast/channels
 * List all broadcast channels with their campaigns.
 */
export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const channels = await getAllChannels()
    const data = await Promise.all(
      channels.map(async ch => ({
        ...ch,
        campaigns: await getCampaignsForChannel(ch.id),
      }))
    )

    return NextResponse.json({ channels: data })
  } catch (error) {
    logger.error("wa-broadcast.channels.get-failed", { error })
    return NextResponse.json({ error: "Falha ao listar canais" }, { status: 500 })
  }
}

/**
 * POST /api/admin/whatsapp-broadcast/channels
 * Create a new channel or update existing.
 */
export async function POST(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json()

    // Update existing
    if (body.id) {
      const updated = await updateChannel(body.id, body)
      if (!updated) {
        return NextResponse.json({ error: "Canal nao encontrado" }, { status: 404 })
      }
      return NextResponse.json({ channel: updated })
    }

    // Create new
    if (!body.name || !body.destinationId) {
      return NextResponse.json(
        { error: "name e destinationId sao obrigatorios" },
        { status: 400 }
      )
    }

    const channel = await createChannel({
      name: body.name,
      destinationId: body.destinationId,
      isActive: body.isActive ?? true,
      timezone: body.timezone || "America/Sao_Paulo",
      quietHoursStart: body.quietHoursStart ?? 22,
      quietHoursEnd: body.quietHoursEnd ?? 7,
      dailyLimit: body.dailyLimit || 3,
      windowLimit: body.windowLimit || 1,
      defaultOfferCount: body.defaultOfferCount || 5,
      groupType: body.groupType || "geral",
      tags: body.tags || [],
      categoriesInclude: body.categoriesInclude || [],
      categoriesExclude: body.categoriesExclude || [],
      marketplacesInclude: body.marketplacesInclude || [],
      marketplacesExclude: body.marketplacesExclude || [],
      templateMode: body.templateMode || "radar",
      tonality: body.tonality || "curadoria",
    })

    return NextResponse.json({ channel }, { status: 201 })
  } catch (error) {
    logger.error("wa-broadcast.channels.create-failed", { error })
    return NextResponse.json({ error: "Falha ao criar canal" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/whatsapp-broadcast/channels?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 })
  }

  const deleted = await deleteChannel(id)
  if (!deleted) {
    return NextResponse.json({ error: "Canal nao encontrado" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
