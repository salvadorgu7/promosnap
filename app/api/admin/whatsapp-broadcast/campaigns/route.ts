import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { logger } from "@/lib/logger"
import {
  getAllCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/lib/whatsapp-broadcast"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/whatsapp-broadcast/campaigns
 * List all campaigns.
 */
export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const campaigns = getAllCampaigns()
    return NextResponse.json({ campaigns })
  } catch (error) {
    logger.error("wa-broadcast.campaigns.get-failed", { error })
    return NextResponse.json({ error: "Falha ao listar campanhas" }, { status: 500 })
  }
}

/**
 * POST /api/admin/whatsapp-broadcast/campaigns
 * Create or update a campaign.
 */
export async function POST(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const body = await req.json()

    // Update
    if (body.id) {
      const updated = updateCampaign(body.id, body)
      if (!updated) {
        return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 })
      }
      return NextResponse.json({ campaign: updated })
    }

    // Create
    if (!body.channelId || !body.name) {
      return NextResponse.json(
        { error: "channelId e name sao obrigatorios" },
        { status: 400 }
      )
    }

    const campaign = createCampaign({
      channelId: body.channelId,
      name: body.name,
      campaignType: body.campaignType || "manual",
      schedule: body.schedule || null,
      isActive: body.isActive ?? true,
      offerCount: body.offerCount || 5,
      minScore: body.minScore || 40,
      minDiscount: body.minDiscount ?? null,
      maxTicket: body.maxTicket ?? null,
      minTicket: body.minTicket ?? null,
      categorySlugs: body.categorySlugs || [],
      marketplaces: body.marketplaces || [],
      requireImage: body.requireImage ?? true,
      requireAffiliate: body.requireAffiliate ?? true,
      prioritizeTopSellers: body.prioritizeTopSellers ?? true,
      structureType: body.structureType || "shortlist",
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    logger.error("wa-broadcast.campaigns.create-failed", { error })
    return NextResponse.json({ error: "Falha ao criar campanha" }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/whatsapp-broadcast/campaigns?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  const id = req.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 })
  }

  const deleted = deleteCampaign(id)
  if (!deleted) {
    return NextResponse.json({ error: "Campanha nao encontrada" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
