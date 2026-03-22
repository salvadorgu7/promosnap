-- ============================================
-- WhatsApp Broadcast — Database Tables
-- Run via: npx prisma db execute --file prisma/sql/002_whatsapp_broadcast.sql
-- ============================================

-- Channels (WhatsApp groups)
CREATE TABLE IF NOT EXISTS "wa_channels" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"                  TEXT NOT NULL,
  "destination_id"        TEXT NOT NULL,
  "is_active"             BOOLEAN NOT NULL DEFAULT true,
  "timezone"              TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  "quiet_hours_start"     INTEGER,
  "quiet_hours_end"       INTEGER,
  "daily_limit"           INTEGER NOT NULL DEFAULT 3,
  "window_limit"          INTEGER NOT NULL DEFAULT 1,
  "default_offer_count"   INTEGER NOT NULL DEFAULT 5,
  "group_type"            TEXT NOT NULL DEFAULT 'geral',
  "tags"                  TEXT[] DEFAULT '{}',
  "categories_include"    TEXT[] DEFAULT '{}',
  "categories_exclude"    TEXT[] DEFAULT '{}',
  "marketplaces_include"  TEXT[] DEFAULT '{}',
  "marketplaces_exclude"  TEXT[] DEFAULT '{}',
  "template_mode"         TEXT NOT NULL DEFAULT 'radar',
  "tonality"              TEXT NOT NULL DEFAULT 'curadoria',
  "sent_today"            INTEGER NOT NULL DEFAULT 0,
  "last_sent_at"          TIMESTAMPTZ,
  "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wa_channels_active_idx" ON "wa_channels" ("is_active");

-- Campaigns (broadcast rules per channel)
CREATE TABLE IF NOT EXISTS "wa_campaigns" (
  "id"                      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "channel_id"              TEXT NOT NULL REFERENCES "wa_channels"("id") ON DELETE CASCADE,
  "name"                    TEXT NOT NULL,
  "campaign_type"           TEXT NOT NULL DEFAULT 'scheduled',
  "schedule"                TEXT,
  "is_active"               BOOLEAN NOT NULL DEFAULT true,
  "offer_count"             INTEGER NOT NULL DEFAULT 5,
  "min_score"               INTEGER NOT NULL DEFAULT 50,
  "min_discount"            INTEGER,
  "max_ticket"              FLOAT,
  "min_ticket"              FLOAT,
  "category_slugs"          TEXT[] DEFAULT '{}',
  "marketplaces"            TEXT[] DEFAULT '{}',
  "require_image"           BOOLEAN NOT NULL DEFAULT true,
  "require_affiliate"       BOOLEAN NOT NULL DEFAULT true,
  "prioritize_top_sellers"  BOOLEAN NOT NULL DEFAULT true,
  "structure_type"          TEXT NOT NULL DEFAULT 'radar',
  "last_run_at"             TIMESTAMPTZ,
  "total_sent"              INTEGER NOT NULL DEFAULT 0,
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wa_campaigns_channel_idx" ON "wa_campaigns" ("channel_id");
CREATE INDEX IF NOT EXISTS "wa_campaigns_active_idx" ON "wa_campaigns" ("is_active");

-- Delivery logs (send history)
CREATE TABLE IF NOT EXISTS "wa_delivery_logs" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "channel_id"        TEXT NOT NULL REFERENCES "wa_channels"("id") ON DELETE CASCADE,
  "channel_name"      TEXT NOT NULL,
  "campaign_id"       TEXT REFERENCES "wa_campaigns"("id") ON DELETE SET NULL,
  "campaign_name"     TEXT,
  "status"            TEXT NOT NULL DEFAULT 'queued',
  "message_text"      TEXT NOT NULL,
  "offer_ids"         TEXT[] DEFAULT '{}',
  "offer_count"       INTEGER NOT NULL DEFAULT 0,
  "template_used"     TEXT,
  "opening_used"      TEXT,
  "cta_used"          TEXT,
  "provider_response" JSONB,
  "error_message"     TEXT,
  "dry_run"           BOOLEAN NOT NULL DEFAULT false,
  "sent_at"           TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "wa_delivery_logs_channel_idx" ON "wa_delivery_logs" ("channel_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "wa_delivery_logs_status_idx" ON "wa_delivery_logs" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "wa_delivery_logs_campaign_idx" ON "wa_delivery_logs" ("campaign_id");
CREATE INDEX IF NOT EXISTS "wa_delivery_logs_sent_at_idx" ON "wa_delivery_logs" ("sent_at" DESC);
CREATE INDEX IF NOT EXISTS "wa_delivery_logs_dry_run_idx" ON "wa_delivery_logs" ("dry_run", "status");

-- Insert default channel if empty
INSERT INTO "wa_channels" ("id", "name", "destination_id", "group_type", "daily_limit", "default_offer_count", "quiet_hours_start", "quiet_hours_end", "template_mode", "tonality", "tags")
SELECT 'ch_default', 'PromoSnap Ofertas', '120363424471768330@g.us', 'geral', 3, 5, 22, 7, 'radar', 'curadoria', ARRAY['geral', 'ofertas']
WHERE NOT EXISTS (SELECT 1 FROM "wa_channels" WHERE "id" = 'ch_default');

-- Insert default campaigns if empty
INSERT INTO "wa_campaigns" ("id", "channel_id", "name", "campaign_type", "schedule", "offer_count", "min_score", "structure_type")
SELECT 'camp_radar_manha', 'ch_default', 'Radar da Manha', 'scheduled', '08:30', 5, 50, 'radar'
WHERE NOT EXISTS (SELECT 1 FROM "wa_campaigns" WHERE "id" = 'camp_radar_manha');

INSERT INTO "wa_campaigns" ("id", "channel_id", "name", "campaign_type", "schedule", "offer_count", "min_score", "min_discount", "structure_type")
SELECT 'camp_achados_almoco', 'ch_default', 'Achados do Almoco', 'scheduled', '12:00', 4, 50, 10, 'shortlist'
WHERE NOT EXISTS (SELECT 1 FROM "wa_campaigns" WHERE "id" = 'camp_achados_almoco');

INSERT INTO "wa_campaigns" ("id", "channel_id", "name", "campaign_type", "schedule", "offer_count", "min_score", "min_discount", "structure_type")
SELECT 'camp_fechamento_dia', 'ch_default', 'Fechamento do Dia', 'scheduled', '19:00', 3, 60, 15, 'hero'
WHERE NOT EXISTS (SELECT 1 FROM "wa_campaigns" WHERE "id" = 'camp_fechamento_dia');
