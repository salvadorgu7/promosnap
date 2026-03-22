// ============================================
// WhatsApp Broadcast Engine — Types
// ============================================

/**
 * Message structure types from Mega Prompt 02.
 * Each structure has a specific use case and format.
 */
export type MessageStructure =
  | "shortlist"     // Estrutura A — 3-5 items diretos
  | "radar"         // Estrutura B — Radar com contexto
  | "hero"          // Estrutura C — Hero + apoio
  | "comparativo"   // Estrutura D — Comparativo rápido
  | "resumo"        // Estrutura E — Resumo semanal

/**
 * Message tonality — how the copy sounds.
 */
export type MessageTonality =
  | "curadoria"     // editorial, curated feel
  | "direto"        // pragmatic, to the point
  | "editorial"     // storytelling, context-rich
  | "economico"     // savings-focused
  | "urgente"       // honest urgency (price drop)

/**
 * Time window for broadcast — determines tone and strategy.
 */
export type TimeWindow = "manha" | "almoco" | "noite"

/**
 * Campaign type — how the campaign is triggered.
 */
export type CampaignType =
  | "scheduled"     // cron-based, runs at fixed times
  | "manual"        // admin triggers manually
  | "event"         // triggered by price drop or campaign

/**
 * Group type — determines content strategy.
 */
export type GroupType =
  | "geral"         // mixed categories
  | "tech"          // electronics, gadgets
  | "casa"          // home, utilities
  | "ticket-baixo"  // up to R$100
  | "premium"       // high-ticket, fewer items

/**
 * Delivery status for a send job.
 */
export type DeliveryStatus =
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "dry_run"

// ============================================
// Channel (WhatsApp group) configuration
// ============================================

export interface BroadcastChannel {
  id: string
  name: string
  destinationId: string // WhatsApp group ID
  isActive: boolean
  timezone: string
  quietHoursStart: number | null
  quietHoursEnd: number | null
  dailyLimit: number
  windowLimit: number
  defaultOfferCount: number
  groupType: GroupType
  tags: string[]
  categoriesInclude: string[]
  categoriesExclude: string[]
  marketplacesInclude: string[]
  marketplacesExclude: string[]
  templateMode: MessageStructure
  tonality: MessageTonality
  sentToday: number
  lastSentAt: Date | null
  createdAt: Date
}

// ============================================
// Campaign (rule set for a broadcast)
// ============================================

export interface BroadcastCampaign {
  id: string
  channelId: string
  name: string
  campaignType: CampaignType
  schedule: string | null // "08:00,12:00,19:00" or cron
  isActive: boolean
  // Selection rules
  offerCount: number
  minScore: number
  minDiscount: number | null
  maxTicket: number | null
  minTicket: number | null
  categorySlugs: string[]
  marketplaces: string[]
  requireImage: boolean
  requireAffiliate: boolean
  prioritizeTopSellers: boolean
  // Template
  structureType: MessageStructure
  // Stats
  lastRunAt: Date | null
  totalSent: number
  createdAt: Date
}

// ============================================
// Composed message (ready to send)
// ============================================

export interface ComposedMessage {
  text: string
  offers: SelectedOffer[]
  structure: MessageStructure
  opening: string
  cta: string
  transition: string | null
  channelId: string
  campaignId: string | null
  templateKey: string
}

// ============================================
// Selected offer (post quality gates)
// ============================================

export interface SelectedOffer {
  offerId: string
  productName: string
  productSlug: string
  currentPrice: number
  originalPrice: number | null
  discount: number
  offerScore: number
  sourceSlug: string
  sourceName: string
  affiliateUrl: string
  productUrl: string
  imageUrl: string | null
  isFreeShipping: boolean
  rating: number | null
  couponText: string | null
  // Broadcast-specific tracking
  position: number
  campaignTrackingUrl: string
}

// ============================================
// Delivery log entry
// ============================================

export interface DeliveryLogEntry {
  id: string
  channelId: string
  channelName: string
  campaignId: string | null
  campaignName: string | null
  status: DeliveryStatus
  messageText: string
  offerIds: string[]
  offerCount: number
  templateUsed: string
  openingUsed: string
  ctaUsed: string
  providerResponse: Record<string, unknown> | null
  errorMessage: string | null
  dryRun: boolean
  sentAt: Date | null
  createdAt: Date
}

// ============================================
// Send job (queued broadcast)
// ============================================

export interface SendJob {
  id: string
  channelId: string
  campaignId: string | null
  composedMessage: ComposedMessage
  status: DeliveryStatus
  scheduledAt: Date | null
  retries: number
  maxRetries: number
  lastError: string | null
  createdAt: Date
}

// ============================================
// Broadcast metrics
// ============================================

export interface BroadcastMetrics {
  totalSent: number
  totalFailed: number
  totalDryRun: number
  sentToday: number
  sentThisWeek: number
  byChannel: Record<string, { sent: number; failed: number }>
  byCampaign: Record<string, { sent: number; failed: number }>
  byTemplate: Record<string, number>
  byHour: Record<number, number>
  topOffers: Array<{ offerId: string; productName: string; count: number }>
}

// ============================================
// Provider send result
// ============================================

export interface WaSendResult {
  success: boolean
  messageId?: string
  error?: string
  providerResponse?: Record<string, unknown>
}
