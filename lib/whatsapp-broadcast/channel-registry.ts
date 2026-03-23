// ============================================
// WhatsApp Broadcast — Channel Registry
// DB-backed (Prisma) with in-memory fallback
// ============================================

import { logger } from "@/lib/logger"
import prisma from "@/lib/db/prisma"
import type { BroadcastChannel, BroadcastCampaign, GroupType, MessageStructure, MessageTonality } from "./types"

const log = logger.child({ module: "wa-broadcast.channel-registry" })

// ============================================
// In-memory fallback (used when DB unavailable)
// ============================================

const fallbackChannels = new Map<string, BroadcastChannel>()
const fallbackCampaigns = new Map<string, BroadcastCampaign>()
let fallbackMode = false

const DEFAULT_GROUP_ID = process.env.WHATSAPP_GROUP_ID || "120363424471768330@g.us"

function ensureFallbackDefaults(): void {
  if (fallbackChannels.size > 0) return

  const defaultChannel: BroadcastChannel = {
    id: "ch_default",
    name: "PromoSnap Ofertas",
    destinationId: DEFAULT_GROUP_ID,
    isActive: true,
    timezone: "America/Sao_Paulo",
    quietHoursStart: null,
    quietHoursEnd: null,
    dailyLimit: 10,
    windowLimit: 1,
    defaultOfferCount: 5,
    groupType: "geral",
    tags: ["geral", "ofertas"],
    categoriesInclude: [],
    categoriesExclude: [],
    marketplacesInclude: [],
    marketplacesExclude: [],
    templateMode: "radar",
    tonality: "curadoria",
    sentToday: 0,
    lastSentAt: null,
    createdAt: new Date(),
  }

  fallbackChannels.set(defaultChannel.id, defaultChannel)

  const defaults: Omit<BroadcastCampaign, "id" | "createdAt">[] = [
    { channelId: "ch_default", name: "Radar da Manha", campaignType: "scheduled", schedule: "08:30", isActive: true, offerCount: 5, minScore: 50, minDiscount: null, maxTicket: null, minTicket: null, categorySlugs: [], marketplaces: [], requireImage: true, requireAffiliate: true, prioritizeTopSellers: true, structureType: "radar", lastRunAt: null, totalSent: 0 },
    { channelId: "ch_default", name: "Achados do Almoco", campaignType: "scheduled", schedule: "12:00", isActive: true, offerCount: 4, minScore: 50, minDiscount: 10, maxTicket: null, minTicket: null, categorySlugs: [], marketplaces: [], requireImage: true, requireAffiliate: true, prioritizeTopSellers: true, structureType: "shortlist", lastRunAt: null, totalSent: 0 },
    { channelId: "ch_default", name: "Fechamento do Dia", campaignType: "scheduled", schedule: "19:00", isActive: true, offerCount: 3, minScore: 60, minDiscount: 15, maxTicket: null, minTicket: null, categorySlugs: [], marketplaces: [], requireImage: true, requireAffiliate: true, prioritizeTopSellers: true, structureType: "hero", lastRunAt: null, totalSent: 0 },
  ]

  let counter = 0
  for (const c of defaults) {
    const id = `camp_${++counter}`
    fallbackCampaigns.set(id, { ...c, id, createdAt: new Date() })
  }
}

// ============================================
// Prisma → BroadcastChannel mapper
// ============================================

function dbToChannel(row: any): BroadcastChannel {
  return {
    id: row.id,
    name: row.name,
    destinationId: row.destinationId,
    isActive: row.isActive,
    timezone: row.timezone,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    dailyLimit: row.dailyLimit,
    windowLimit: row.windowLimit,
    defaultOfferCount: row.defaultOfferCount,
    groupType: row.groupType as GroupType,
    tags: row.tags || [],
    categoriesInclude: row.categoriesInclude || [],
    categoriesExclude: row.categoriesExclude || [],
    marketplacesInclude: row.marketplacesInclude || [],
    marketplacesExclude: row.marketplacesExclude || [],
    templateMode: row.templateMode as MessageStructure,
    tonality: row.tonality as MessageTonality,
    sentToday: row.sentToday,
    lastSentAt: row.lastSentAt,
    createdAt: row.createdAt,
  }
}

function dbToCampaign(row: any): BroadcastCampaign {
  return {
    id: row.id,
    channelId: row.channelId,
    name: row.name,
    campaignType: row.campaignType as any,
    schedule: row.schedule,
    isActive: row.isActive,
    offerCount: row.offerCount,
    minScore: row.minScore,
    minDiscount: row.minDiscount,
    maxTicket: row.maxTicket,
    minTicket: row.minTicket,
    categorySlugs: row.categorySlugs || [],
    marketplaces: row.marketplaces || [],
    requireImage: row.requireImage,
    requireAffiliate: row.requireAffiliate,
    prioritizeTopSellers: row.prioritizeTopSellers,
    structureType: row.structureType as MessageStructure,
    lastRunAt: row.lastRunAt,
    totalSent: row.totalSent,
    createdAt: row.createdAt,
  }
}

// ============================================
// Channel CRUD
// ============================================

export async function getAllChannels(): Promise<BroadcastChannel[]> {
  try {
    const rows = await prisma.waChannel.findMany({ orderBy: { createdAt: "asc" } })
    if (rows.length === 0) {
      // DB is empty — may need seed (handled by SQL file)
      ensureFallbackDefaults()
      return Array.from(fallbackChannels.values())
    }
    return rows.map(dbToChannel)
  } catch (err) {
    log.warn("channel-registry.db-fallback", { error: (err as Error).message })
    fallbackMode = true
    ensureFallbackDefaults()
    return Array.from(fallbackChannels.values())
  }
}

export async function getChannel(id: string): Promise<BroadcastChannel | null> {
  try {
    const row = await prisma.waChannel.findUnique({ where: { id } })
    if (row) return dbToChannel(row)
    // Fallback check
    ensureFallbackDefaults()
    return fallbackChannels.get(id) || null
  } catch {
    ensureFallbackDefaults()
    return fallbackChannels.get(id) || null
  }
}

export async function getActiveChannels(): Promise<BroadcastChannel[]> {
  try {
    const rows = await prisma.waChannel.findMany({ where: { isActive: true } })
    if (rows.length === 0) {
      ensureFallbackDefaults()
      return Array.from(fallbackChannels.values()).filter(c => c.isActive)
    }
    return rows.map(dbToChannel)
  } catch {
    ensureFallbackDefaults()
    return Array.from(fallbackChannels.values()).filter(c => c.isActive)
  }
}

export async function createChannel(data: Omit<BroadcastChannel, "id" | "createdAt" | "sentToday" | "lastSentAt">): Promise<BroadcastChannel> {
  try {
    const row = await prisma.waChannel.create({
      data: {
        name: data.name,
        destinationId: data.destinationId,
        isActive: data.isActive,
        timezone: data.timezone,
        quietHoursStart: data.quietHoursStart,
        quietHoursEnd: data.quietHoursEnd,
        dailyLimit: data.dailyLimit,
        windowLimit: data.windowLimit,
        defaultOfferCount: data.defaultOfferCount,
        groupType: data.groupType,
        tags: data.tags,
        categoriesInclude: data.categoriesInclude,
        categoriesExclude: data.categoriesExclude,
        marketplacesInclude: data.marketplacesInclude,
        marketplacesExclude: data.marketplacesExclude,
        templateMode: data.templateMode,
        tonality: data.tonality,
      },
    })
    log.info("channel-registry.channel-created", { id: row.id, name: data.name })
    return dbToChannel(row)
  } catch (err) {
    log.error("channel-registry.create-failed", { error: (err as Error).message })
    // Fallback
    ensureFallbackDefaults()
    const id = `ch_fb_${Date.now()}`
    const channel: BroadcastChannel = { ...data, id, sentToday: 0, lastSentAt: null, createdAt: new Date() }
    fallbackChannels.set(id, channel)
    return channel
  }
}

export async function updateChannel(id: string, updates: Partial<BroadcastChannel>): Promise<BroadcastChannel | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, sentToday: _st, lastSentAt: _ls, campaigns: _camps, ...data } = updates as any

    // Use upsert — fallback channels (e.g. "ch_default") may not exist in DB yet
    const row = await prisma.waChannel.upsert({
      where: { id },
      update: data,
      create: {
        id,
        name: data.name || "PromoSnap Ofertas",
        destinationId: data.destinationId || "",
        isActive: data.isActive ?? true,
        timezone: data.timezone || "America/Sao_Paulo",
        quietHoursStart: data.quietHoursStart ?? null,
        quietHoursEnd: data.quietHoursEnd ?? null,
        dailyLimit: data.dailyLimit ?? 10,
        windowLimit: data.windowLimit ?? 1,
        defaultOfferCount: data.defaultOfferCount ?? 5,
        groupType: data.groupType || "geral",
        tags: data.tags || [],
        categoriesInclude: data.categoriesInclude || [],
        categoriesExclude: data.categoriesExclude || [],
        marketplacesInclude: data.marketplacesInclude || [],
        marketplacesExclude: data.marketplacesExclude || [],
        templateMode: data.templateMode || "radar",
        tonality: data.tonality || "curadoria",
      },
    })
    log.info("channel-registry.channel-upserted", { id })
    return dbToChannel(row)
  } catch (err) {
    log.error("channel-registry.update-failed", { id, error: (err as Error).message })
    ensureFallbackDefaults()
    const channel = fallbackChannels.get(id)
    if (!channel) return null
    const updated = { ...channel, ...updates, id }
    fallbackChannels.set(id, updated)
    return updated
  }
}

export async function deleteChannel(id: string): Promise<boolean> {
  try {
    await prisma.waChannel.delete({ where: { id } })
    log.info("channel-registry.channel-deleted", { id })
    return true
  } catch {
    const existed = fallbackChannels.delete(id)
    if (existed) {
      for (const [campId, camp] of fallbackCampaigns) {
        if (camp.channelId === id) fallbackCampaigns.delete(campId)
      }
    }
    return existed
  }
}

// ============================================
// Campaign CRUD
// ============================================

export async function getAllCampaigns(): Promise<BroadcastCampaign[]> {
  try {
    const rows = await prisma.waCampaign.findMany({ orderBy: { createdAt: "asc" } })
    if (rows.length === 0) {
      ensureFallbackDefaults()
      return Array.from(fallbackCampaigns.values())
    }
    return rows.map(dbToCampaign)
  } catch {
    ensureFallbackDefaults()
    return Array.from(fallbackCampaigns.values())
  }
}

export async function getCampaign(id: string): Promise<BroadcastCampaign | null> {
  try {
    const row = await prisma.waCampaign.findUnique({ where: { id } })
    if (row) return dbToCampaign(row)
    ensureFallbackDefaults()
    return fallbackCampaigns.get(id) || null
  } catch {
    ensureFallbackDefaults()
    return fallbackCampaigns.get(id) || null
  }
}

export async function getCampaignsForChannel(channelId: string): Promise<BroadcastCampaign[]> {
  try {
    const rows = await prisma.waCampaign.findMany({ where: { channelId }, orderBy: { createdAt: "asc" } })
    return rows.map(dbToCampaign)
  } catch {
    ensureFallbackDefaults()
    return Array.from(fallbackCampaigns.values()).filter(c => c.channelId === channelId)
  }
}

export async function getActiveCampaigns(): Promise<BroadcastCampaign[]> {
  try {
    const rows = await prisma.waCampaign.findMany({ where: { isActive: true } })
    return rows.map(dbToCampaign)
  } catch {
    ensureFallbackDefaults()
    return Array.from(fallbackCampaigns.values()).filter(c => c.isActive)
  }
}

export async function createCampaign(data: Omit<BroadcastCampaign, "id" | "createdAt" | "lastRunAt" | "totalSent">): Promise<BroadcastCampaign> {
  try {
    const row = await prisma.waCampaign.create({
      data: {
        channelId: data.channelId,
        name: data.name,
        campaignType: data.campaignType,
        schedule: data.schedule,
        isActive: data.isActive,
        offerCount: data.offerCount,
        minScore: data.minScore,
        minDiscount: data.minDiscount,
        maxTicket: data.maxTicket,
        minTicket: data.minTicket,
        categorySlugs: data.categorySlugs,
        marketplaces: data.marketplaces,
        requireImage: data.requireImage,
        requireAffiliate: data.requireAffiliate,
        prioritizeTopSellers: data.prioritizeTopSellers,
        structureType: data.structureType,
      },
    })
    log.info("channel-registry.campaign-created", { id: row.id, name: data.name })
    return dbToCampaign(row)
  } catch (err) {
    log.error("channel-registry.campaign-create-failed", { error: (err as Error).message })
    ensureFallbackDefaults()
    const id = `camp_fb_${Date.now()}`
    const campaign: BroadcastCampaign = { ...data, id, lastRunAt: null, totalSent: 0, createdAt: new Date() }
    fallbackCampaigns.set(id, campaign)
    return campaign
  }
}

export async function updateCampaign(id: string, updates: Partial<BroadcastCampaign>): Promise<BroadcastCampaign | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, createdAt: _ca, channelName: _cn, ...data } = updates as any

    // Use upsert — fallback campaigns may not exist in DB yet
    const row = await prisma.waCampaign.upsert({
      where: { id },
      update: data,
      create: {
        id,
        channelId: data.channelId || "",
        name: data.name || "Campanha",
        campaignType: data.campaignType || "scheduled",
        schedule: data.schedule || null,
        isActive: data.isActive ?? true,
        offerCount: data.offerCount ?? 5,
        minScore: data.minScore ?? 40,
        minDiscount: data.minDiscount ?? null,
        maxTicket: data.maxTicket ?? null,
        minTicket: data.minTicket ?? null,
        categorySlugs: data.categorySlugs || [],
        marketplaces: data.marketplaces || [],
        requireImage: data.requireImage ?? true,
        requireAffiliate: data.requireAffiliate ?? true,
        prioritizeTopSellers: data.prioritizeTopSellers ?? true,
        structureType: data.structureType || "radar",
      },
    })
    log.info("channel-registry.campaign-upserted", { id })
    return dbToCampaign(row)
  } catch (err) {
    log.error("channel-registry.campaign-update-failed", { id, error: (err as Error).message })
    ensureFallbackDefaults()
    const campaign = fallbackCampaigns.get(id)
    if (!campaign) return null
    const updated = { ...campaign, ...updates, id }
    fallbackCampaigns.set(id, updated)
    return updated
  }
}

export async function deleteCampaign(id: string): Promise<boolean> {
  try {
    await prisma.waCampaign.delete({ where: { id } })
    log.info("channel-registry.campaign-deleted", { id })
    return true
  } catch {
    return fallbackCampaigns.delete(id)
  }
}

/**
 * Record that a campaign was executed.
 */
export async function recordCampaignRun(campaignId: string): Promise<void> {
  try {
    await prisma.waCampaign.update({
      where: { id: campaignId },
      data: {
        lastRunAt: new Date(),
        totalSent: { increment: 1 },
      },
    })
  } catch {
    const campaign = fallbackCampaigns.get(campaignId)
    if (campaign) {
      campaign.lastRunAt = new Date()
      campaign.totalSent++
    }
  }
}

/**
 * Record that a channel sent a message.
 */
export async function recordChannelSend(channelId: string): Promise<void> {
  try {
    await prisma.waChannel.update({
      where: { id: channelId },
      data: {
        sentToday: { increment: 1 },
        lastSentAt: new Date(),
      },
    })
  } catch {
    const channel = fallbackChannels.get(channelId)
    if (channel) {
      channel.sentToday++
      channel.lastSentAt = new Date()
    }
  }
}

/**
 * Reset daily counters (call at midnight or start of cron).
 */
export async function resetDailyCounters(): Promise<void> {
  try {
    await prisma.waChannel.updateMany({
      data: { sentToday: 0 },
    })
  } catch {
    for (const channel of fallbackChannels.values()) {
      channel.sentToday = 0
    }
  }
}

/**
 * Get campaigns due for execution based on current time.
 */
export async function getDueCampaigns(): Promise<Array<{ campaign: BroadcastCampaign; channel: BroadcastChannel }>> {
  const allCampaigns = await getActiveCampaigns()
  const allChannels = await getAllChannels()
  const channelMap = new Map(allChannels.map(c => [c.id, c]))

  const now = new Date()
  let currentHour: number
  let currentMinute: number
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    })
    const parts = formatter.formatToParts(now)
    currentHour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10)
    currentMinute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10)
  } catch {
    currentHour = (now.getUTCHours() - 3 + 24) % 24
    currentMinute = now.getMinutes()
  }

  const due: Array<{ campaign: BroadcastCampaign; channel: BroadcastChannel }> = []

  for (const campaign of allCampaigns) {
    if (campaign.campaignType !== "scheduled" || !campaign.schedule) continue

    const channel = channelMap.get(campaign.channelId)
    if (!channel || !channel.isActive) continue

    const scheduleTimes = campaign.schedule.split(",").map(t => t.trim())
    for (const schedTime of scheduleTimes) {
      const [schedH, schedM] = schedTime.split(":").map(Number)
      const schedMinutes = schedH * 60 + schedM
      const currentMinutes = currentHour * 60 + currentMinute
      const diff = Math.abs(currentMinutes - schedMinutes)

      if (diff <= 30) {
        if (campaign.lastRunAt) {
          const elapsed = Date.now() - campaign.lastRunAt.getTime()
          if (elapsed < 2 * 60 * 60 * 1000) continue
        }
        due.push({ campaign, channel })
        break
      }
    }
  }

  return due
}
