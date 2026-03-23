// ============================================
// WhatsApp Broadcast — Database Auto-Init
// Creates tables if they don't exist (self-healing)
// ============================================

import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"

const log = logger.child({ module: "wa-broadcast.db-init" })

let initAttempted = false
let tablesReady = false

/**
 * Ensure WhatsApp broadcast tables exist.
 * Called lazily on first DB access failure.
 * Safe to call multiple times (idempotent).
 */
export async function ensureWaBroadcastTables(): Promise<boolean> {
  if (tablesReady) return true
  if (initAttempted) return false // Already tried and failed this instance

  initAttempted = true

  try {
    // Quick check: try a simple query
    await prisma.waChannel.count()
    tablesReady = true
    return true
  } catch {
    // Table doesn't exist or column mismatch — create it
    log.info("db-init.creating-wa-tables")
  }

  try {
    // Create tables with camelCase columns matching Prisma schema
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "wa_channels" (
        "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "name"                  TEXT NOT NULL,
        "destinationId"         TEXT NOT NULL,
        "isActive"              BOOLEAN NOT NULL DEFAULT true,
        "timezone"              TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
        "quietHoursStart"       INTEGER,
        "quietHoursEnd"         INTEGER,
        "dailyLimit"            INTEGER NOT NULL DEFAULT 3,
        "windowLimit"           INTEGER NOT NULL DEFAULT 1,
        "defaultOfferCount"     INTEGER NOT NULL DEFAULT 5,
        "groupType"             TEXT NOT NULL DEFAULT 'geral',
        "tags"                  TEXT[] DEFAULT '{}',
        "categoriesInclude"     TEXT[] DEFAULT '{}',
        "categoriesExclude"     TEXT[] DEFAULT '{}',
        "marketplacesInclude"   TEXT[] DEFAULT '{}',
        "marketplacesExclude"   TEXT[] DEFAULT '{}',
        "templateMode"          TEXT NOT NULL DEFAULT 'radar',
        "tonality"              TEXT NOT NULL DEFAULT 'curadoria',
        "sentToday"             INTEGER NOT NULL DEFAULT 0,
        "lastSentAt"            TIMESTAMPTZ,
        "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "wa_campaigns" (
        "id"                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "channelId"               TEXT NOT NULL REFERENCES "wa_channels"("id") ON DELETE CASCADE,
        "name"                    TEXT NOT NULL,
        "campaignType"            TEXT NOT NULL DEFAULT 'scheduled',
        "schedule"                TEXT,
        "isActive"                BOOLEAN NOT NULL DEFAULT true,
        "offerCount"              INTEGER NOT NULL DEFAULT 5,
        "minScore"                INTEGER NOT NULL DEFAULT 50,
        "minDiscount"             INTEGER,
        "maxTicket"               DOUBLE PRECISION,
        "minTicket"               DOUBLE PRECISION,
        "categorySlugs"           TEXT[] DEFAULT '{}',
        "marketplaces"            TEXT[] DEFAULT '{}',
        "requireImage"            BOOLEAN NOT NULL DEFAULT true,
        "requireAffiliate"        BOOLEAN NOT NULL DEFAULT true,
        "prioritizeTopSellers"    BOOLEAN NOT NULL DEFAULT true,
        "structureType"           TEXT NOT NULL DEFAULT 'radar',
        "lastRunAt"               TIMESTAMPTZ,
        "totalSent"               INTEGER NOT NULL DEFAULT 0,
        "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "wa_delivery_logs" (
        "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "channelId"         TEXT NOT NULL REFERENCES "wa_channels"("id") ON DELETE CASCADE,
        "channelName"       TEXT NOT NULL,
        "campaignId"        TEXT REFERENCES "wa_campaigns"("id") ON DELETE SET NULL,
        "campaignName"      TEXT,
        "status"            TEXT NOT NULL DEFAULT 'queued',
        "messageText"       TEXT NOT NULL,
        "offerIds"          TEXT[] DEFAULT '{}',
        "offerCount"        INTEGER NOT NULL DEFAULT 0,
        "templateUsed"      TEXT,
        "openingUsed"       TEXT,
        "ctaUsed"           TEXT,
        "providerResponse"  JSONB,
        "errorMessage"      TEXT,
        "dryRun"            BOOLEAN NOT NULL DEFAULT false,
        "sentAt"            TIMESTAMPTZ,
        "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    // Indexes
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wa_channels_isActive_idx" ON "wa_channels" ("isActive")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wa_campaigns_channelId_idx" ON "wa_campaigns" ("channelId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wa_campaigns_isActive_idx" ON "wa_campaigns" ("isActive")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wa_delivery_logs_channelId_createdAt_idx" ON "wa_delivery_logs" ("channelId", "createdAt" DESC)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wa_delivery_logs_status_createdAt_idx" ON "wa_delivery_logs" ("status", "createdAt" DESC)`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "wa_delivery_logs_dryRun_status_idx" ON "wa_delivery_logs" ("dryRun", "status")`)

    // Seed default channel
    await prisma.$executeRawUnsafe(`
      INSERT INTO "wa_channels" ("id", "name", "destinationId", "groupType", "dailyLimit", "defaultOfferCount", "quietHoursStart", "quietHoursEnd", "templateMode", "tonality", "tags")
      VALUES ('ch_default', 'PromoSnap Ofertas', '120363424471768330@g.us', 'geral', 10, 5, 22, 7, 'radar', 'curadoria', ARRAY['geral', 'ofertas'])
      ON CONFLICT ("id") DO NOTHING
    `)

    // Seed default campaigns
    await prisma.$executeRawUnsafe(`
      INSERT INTO "wa_campaigns" ("id", "channelId", "name", "campaignType", "schedule", "offerCount", "minScore", "structureType")
      VALUES ('camp_radar_manha', 'ch_default', 'Radar da Manha', 'scheduled', '08:30', 5, 50, 'radar')
      ON CONFLICT ("id") DO NOTHING
    `)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "wa_campaigns" ("id", "channelId", "name", "campaignType", "schedule", "offerCount", "minScore", "minDiscount", "structureType")
      VALUES ('camp_achados_almoco', 'ch_default', 'Achados do Almoco', 'scheduled', '12:00', 4, 50, 10, 'shortlist')
      ON CONFLICT ("id") DO NOTHING
    `)
    await prisma.$executeRawUnsafe(`
      INSERT INTO "wa_campaigns" ("id", "channelId", "name", "campaignType", "schedule", "offerCount", "minScore", "minDiscount", "structureType")
      VALUES ('camp_fechamento_dia', 'ch_default', 'Fechamento do Dia', 'scheduled', '19:00', 3, 60, 15, 'hero')
      ON CONFLICT ("id") DO NOTHING
    `)

    log.info("db-init.wa-tables-created")
    tablesReady = true
    return true
  } catch (err) {
    log.error("db-init.failed", { error: (err as Error).message })
    return false
  }
}
