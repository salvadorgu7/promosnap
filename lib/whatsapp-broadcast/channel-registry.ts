// ============================================
// WhatsApp Broadcast — Channel Registry
// In-memory channel management (DB-backed in future via SystemSetting)
// ============================================

import { logger } from "@/lib/logger"
import type { BroadcastChannel, BroadcastCampaign, GroupType, MessageStructure, MessageTonality } from "./types"

const log = logger.child({ module: "wa-broadcast.channel-registry" })

// ============================================
// In-memory store (will be persisted via SystemSetting)
// ============================================

const channels = new Map<string, BroadcastChannel>()
const campaigns = new Map<string, BroadcastCampaign>()

let channelCounter = 0
let campaignCounter = 0

// ============================================
// Default channel — PromoSnap main group
// ============================================

const DEFAULT_GROUP_ID = process.env.WHATSAPP_GROUP_ID || "120363424471768330@g.us"

function ensureDefaultChannel(): void {
  if (channels.size > 0) return

  const defaultChannel: BroadcastChannel = {
    id: "ch_default",
    name: "PromoSnap Ofertas",
    destinationId: DEFAULT_GROUP_ID,
    isActive: true,
    timezone: "America/Sao_Paulo",
    quietHoursStart: 22,
    quietHoursEnd: 7,
    dailyLimit: 3,
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

  channels.set(defaultChannel.id, defaultChannel)

  // Default campaigns
  const defaultCampaigns: Omit<BroadcastCampaign, "id" | "createdAt">[] = [
    {
      channelId: defaultChannel.id,
      name: "Radar da Manha",
      campaignType: "scheduled",
      schedule: "08:30",
      isActive: true,
      offerCount: 5,
      minScore: 50,
      minDiscount: null,
      maxTicket: null,
      minTicket: null,
      categorySlugs: [],
      marketplaces: [],
      requireImage: true,
      requireAffiliate: true,
      prioritizeTopSellers: true,
      structureType: "radar",
      lastRunAt: null,
      totalSent: 0,
    },
    {
      channelId: defaultChannel.id,
      name: "Achados do Almoco",
      campaignType: "scheduled",
      schedule: "12:00",
      isActive: true,
      offerCount: 4,
      minScore: 50,
      minDiscount: 10,
      maxTicket: null,
      minTicket: null,
      categorySlugs: [],
      marketplaces: [],
      requireImage: true,
      requireAffiliate: true,
      prioritizeTopSellers: true,
      structureType: "shortlist",
      lastRunAt: null,
      totalSent: 0,
    },
    {
      channelId: defaultChannel.id,
      name: "Fechamento do Dia",
      campaignType: "scheduled",
      schedule: "19:00",
      isActive: true,
      offerCount: 3,
      minScore: 60,
      minDiscount: 15,
      maxTicket: null,
      minTicket: null,
      categorySlugs: [],
      marketplaces: [],
      requireImage: true,
      requireAffiliate: true,
      prioritizeTopSellers: true,
      structureType: "hero",
      lastRunAt: null,
      totalSent: 0,
    },
  ]

  for (const c of defaultCampaigns) {
    const id = `camp_${++campaignCounter}`
    campaigns.set(id, { ...c, id, createdAt: new Date() })
  }

  log.info("channel-registry.defaults-created", {
    channels: channels.size,
    campaigns: campaigns.size,
  })
}

// ============================================
// Channel CRUD
// ============================================

export function getAllChannels(): BroadcastChannel[] {
  ensureDefaultChannel()
  return Array.from(channels.values())
}

export function getChannel(id: string): BroadcastChannel | null {
  ensureDefaultChannel()
  return channels.get(id) || null
}

export function getActiveChannels(): BroadcastChannel[] {
  ensureDefaultChannel()
  return Array.from(channels.values()).filter(c => c.isActive)
}

export function createChannel(data: Omit<BroadcastChannel, "id" | "createdAt" | "sentToday" | "lastSentAt">): BroadcastChannel {
  ensureDefaultChannel()
  const id = `ch_${++channelCounter}_${Date.now()}`
  const channel: BroadcastChannel = {
    ...data,
    id,
    sentToday: 0,
    lastSentAt: null,
    createdAt: new Date(),
  }
  channels.set(id, channel)
  log.info("channel-registry.channel-created", { id, name: data.name })
  return channel
}

export function updateChannel(id: string, updates: Partial<BroadcastChannel>): BroadcastChannel | null {
  ensureDefaultChannel()
  const channel = channels.get(id)
  if (!channel) return null

  const updated = { ...channel, ...updates, id } // Prevent ID override
  channels.set(id, updated)
  log.info("channel-registry.channel-updated", { id })
  return updated
}

export function deleteChannel(id: string): boolean {
  const existed = channels.delete(id)
  if (existed) {
    // Remove associated campaigns
    for (const [campId, camp] of campaigns) {
      if (camp.channelId === id) campaigns.delete(campId)
    }
    log.info("channel-registry.channel-deleted", { id })
  }
  return existed
}

// ============================================
// Campaign CRUD
// ============================================

export function getAllCampaigns(): BroadcastCampaign[] {
  ensureDefaultChannel()
  return Array.from(campaigns.values())
}

export function getCampaign(id: string): BroadcastCampaign | null {
  ensureDefaultChannel()
  return campaigns.get(id) || null
}

export function getCampaignsForChannel(channelId: string): BroadcastCampaign[] {
  ensureDefaultChannel()
  return Array.from(campaigns.values()).filter(c => c.channelId === channelId)
}

export function getActiveCampaigns(): BroadcastCampaign[] {
  ensureDefaultChannel()
  return Array.from(campaigns.values()).filter(c => c.isActive)
}

export function createCampaign(data: Omit<BroadcastCampaign, "id" | "createdAt" | "lastRunAt" | "totalSent">): BroadcastCampaign {
  ensureDefaultChannel()
  const id = `camp_${++campaignCounter}_${Date.now()}`
  const campaign: BroadcastCampaign = {
    ...data,
    id,
    lastRunAt: null,
    totalSent: 0,
    createdAt: new Date(),
  }
  campaigns.set(id, campaign)
  log.info("channel-registry.campaign-created", { id, name: data.name, channelId: data.channelId })
  return campaign
}

export function updateCampaign(id: string, updates: Partial<BroadcastCampaign>): BroadcastCampaign | null {
  ensureDefaultChannel()
  const campaign = campaigns.get(id)
  if (!campaign) return null

  const updated = { ...campaign, ...updates, id }
  campaigns.set(id, updated)
  log.info("channel-registry.campaign-updated", { id })
  return updated
}

export function deleteCampaign(id: string): boolean {
  const existed = campaigns.delete(id)
  if (existed) log.info("channel-registry.campaign-deleted", { id })
  return existed
}

/**
 * Record that a campaign was executed.
 */
export function recordCampaignRun(campaignId: string): void {
  const campaign = campaigns.get(campaignId)
  if (campaign) {
    campaign.lastRunAt = new Date()
    campaign.totalSent++
  }
}

/**
 * Record that a channel sent a message.
 */
export function recordChannelSend(channelId: string): void {
  const channel = channels.get(channelId)
  if (channel) {
    channel.sentToday++
    channel.lastSentAt = new Date()
  }
}

/**
 * Reset daily counters (call at midnight or start of cron).
 */
export function resetDailyCounters(): void {
  for (const channel of channels.values()) {
    channel.sentToday = 0
  }
}

/**
 * Get campaigns due for execution based on current time.
 */
export function getDueCampaigns(): Array<{ campaign: BroadcastCampaign; channel: BroadcastChannel }> {
  ensureDefaultChannel()

  const now = new Date()
  // Get current BRT hour
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

  const currentTime = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`
  const due: Array<{ campaign: BroadcastCampaign; channel: BroadcastChannel }> = []

  for (const campaign of campaigns.values()) {
    if (!campaign.isActive || campaign.campaignType !== "scheduled" || !campaign.schedule) continue

    const channel = channels.get(campaign.channelId)
    if (!channel || !channel.isActive) continue

    // Check if current time matches schedule (with 30-min window)
    const scheduleTimes = campaign.schedule.split(",").map(t => t.trim())
    for (const schedTime of scheduleTimes) {
      const [schedH, schedM] = schedTime.split(":").map(Number)
      const schedMinutes = schedH * 60 + schedM
      const currentMinutes = currentHour * 60 + currentMinute
      const diff = Math.abs(currentMinutes - schedMinutes)

      // Within 30 minutes of scheduled time
      if (diff <= 30) {
        // Check if already ran recently (2h cooldown)
        if (campaign.lastRunAt) {
          const elapsed = Date.now() - campaign.lastRunAt.getTime()
          if (elapsed < 2 * 60 * 60 * 1000) continue // Ran less than 2h ago
        }

        due.push({ campaign, channel })
        break
      }
    }
  }

  return due
}
