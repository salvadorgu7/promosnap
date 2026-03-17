-- ================================================
-- Fix: add missing columns to existing tables
-- Safe to re-run (IF NOT EXISTS / IF NOT EXISTS check)
-- ================================================

-- Clickout: block tracking + attribution columns
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "blockId" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "positionInBlock" INTEGER;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "recommendationType" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "pageType" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "channelOrigin" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "bannerId" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "originType" TEXT;
ALTER TABLE "clickouts" ADD COLUMN IF NOT EXISTS "railSource" TEXT;

-- Product: origin tracking columns
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "originType" TEXT NOT NULL DEFAULT 'seed';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "discoverySource" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

-- Indexes on new clickout columns
CREATE INDEX IF NOT EXISTS "clickouts_pageType_clickedAt_idx" ON "clickouts"("pageType", "clickedAt");
CREATE INDEX IF NOT EXISTS "clickouts_channelOrigin_clickedAt_idx" ON "clickouts"("channelOrigin", "clickedAt");
CREATE INDEX IF NOT EXISTS "clickouts_campaignId_idx" ON "clickouts"("campaignId");

-- Product indexes
CREATE INDEX IF NOT EXISTS "products_originType_idx" ON "products"("originType");
CREATE INDEX IF NOT EXISTS "products_importedAt_idx" ON "products"("importedAt");
CREATE INDEX IF NOT EXISTS "products_status_originType_idx" ON "products"("status", "originType");

-- Create tables that may not exist yet
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ImportStatus') THEN CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CandidateStatus') THEN CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IMPORTED'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BannerType') THEN CREATE TYPE "BannerType" AS ENUM ('HERO', 'MODAL', 'STRIP', 'CAROUSEL'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleStatus') THEN CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriberStatus') THEN CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED'); END IF; END $$;

CREATE TABLE IF NOT EXISTS "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "bannerType" "BannerType" NOT NULL DEFAULT 'HERO',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "autoMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "import_batches" (
    "id" TEXT NOT NULL,
    "fileName" TEXT,
    "format" TEXT NOT NULL DEFAULT 'json',
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "catalog_candidates" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "price" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION,
    "affiliateUrl" TEXT,
    "sourceSlug" TEXT,
    "externalId" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDING',
    "enrichedData" JSONB,
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalog_candidates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "imageUrl" TEXT,
    "author" TEXT NOT NULL DEFAULT 'PromoSnap',
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "referrals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "clickouts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SubscriberStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'website',
    "interests" TEXT[],
    "tags" TEXT[],
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscribers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "color" TEXT,
    "size" TEXT,
    "storage" TEXT,
    "modelCode" TEXT,
    "gtin" TEXT,
    "specsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- FKs for new tables
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_candidates_importBatchId_fkey') THEN ALTER TABLE "catalog_candidates" ADD CONSTRAINT "catalog_candidates_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_productId_fkey') THEN ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS "banners_isActive_bannerType_priority_idx" ON "banners"("isActive", "bannerType", "priority" DESC);
CREATE INDEX IF NOT EXISTS "catalog_candidates_status_idx" ON "catalog_candidates"("status");
CREATE INDEX IF NOT EXISTS "catalog_candidates_importBatchId_idx" ON "catalog_candidates"("importBatchId");
CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_key" ON "articles"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_code_key" ON "referrals"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_key" ON "subscribers"("email");
CREATE INDEX IF NOT EXISTS "email_logs_sentAt_idx" ON "email_logs"("sentAt");
