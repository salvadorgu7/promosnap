-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceStatus') THEN CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISABLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW', 'MERGED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingStatus') THEN CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'UNMATCHED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AvailabilityStatus') THEN CREATE TYPE "AvailabilityStatus" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'UNKNOWN'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CouponStatus') THEN CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISABLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EditorialType') THEN CREATE TYPE "EditorialType" AS ENUM ('HERO_BANNER', 'RAIL', 'GRID', 'ARTICLE', 'TOP_PICKS', 'COUPON_WALL'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EditorialStatus') THEN CREATE TYPE "EditorialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobStatus') THEN CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ArticleStatus') THEN CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriberStatus') THEN CREATE TYPE "SubscriberStatus" AS ENUM ('ACTIVE', 'UNSUBSCRIBED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BannerType') THEN CREATE TYPE "BannerType" AS ENUM ('HERO', 'MODAL', 'STRIP', 'CAROUSEL'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ImportStatus') THEN CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'); END IF; END $$;

-- CreateEnum
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CandidateStatus') THEN CREATE TYPE "CandidateStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IMPORTED'); END IF; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "affiliateConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "merchants" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "images" TEXT[],
    "specsJson" JSONB,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "editorialScore" INTEGER,
    "originType" TEXT NOT NULL DEFAULT 'seed',
    "discoverySource" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "listings" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "merchantId" TEXT,
    "productId" TEXT,
    "variantId" TEXT,
    "externalId" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "rawDescription" TEXT,
    "rawBrand" TEXT,
    "rawCategory" TEXT,
    "imageUrl" TEXT,
    "productUrl" TEXT NOT NULL,
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'IN_STOCK',
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "salesCountEstimate" INTEGER,
    "rawPayloadJson" JSONB,
    "matchConfidence" DOUBLE PRECISION,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "offers" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "couponText" TEXT,
    "shippingPrice" DOUBLE PRECISION,
    "installmentText" TEXT,
    "isFreeShipping" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "offerScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "affiliateUrl" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "price_snapshots" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "coupons" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "rulesJson" JSONB,
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "clickouts" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "sourceSlug" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "sessionId" TEXT,
    "query" TEXT,
    "categorySlug" TEXT,
    "userAgent" TEXT,
    "originType" TEXT,
    "railSource" TEXT,
    "blockId" TEXT,
    "positionInBlock" INTEGER,
    "recommendationType" TEXT,
    "ctaLabel" TEXT,
    "pageType" TEXT,
    "channelOrigin" TEXT,
    "campaignId" TEXT,
    "bannerId" TEXT,
    "productId" TEXT,
    "referralCode" TEXT,

    CONSTRAINT "clickouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "search_logs" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT,
    "resultsCount" INTEGER,
    "clickedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "editorial_blocks" (
    "id" TEXT NOT NULL,
    "blockType" "EditorialType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "payloadJson" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "EditorialStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorial_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "job_runs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "itemsTotal" INTEGER,
    "itemsDone" INTEGER,
    "errorLog" TEXT,
    "metadata" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "price_alerts" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "trending_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trending_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "sources_slug_key" ON "sources"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "merchants_sourceId_externalId_key" ON "merchants"("sourceId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_popularityScore_idx" ON "products"("popularityScore" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_originType_idx" ON "products"("originType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_importedAt_idx" ON "products"("importedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_status_popularityScore_idx" ON "products"("status", "popularityScore" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_status_originType_idx" ON "products"("status", "originType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_categoryId_status_idx" ON "products"("categoryId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_brandId_status_idx" ON "products"("brandId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_productId_idx" ON "listings"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_sourceId_idx" ON "listings"("sourceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_sourceId_idx" ON "listings"("status", "sourceId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_productId_status_idx" ON "listings"("productId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "listings_status_lastSeenAt_idx" ON "listings"("status", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "listings_sourceId_externalId_key" ON "listings"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_listingId_idx" ON "offers"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_offerScore_idx" ON "offers"("offerScore" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_isActive_idx" ON "offers"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_currentPrice_idx" ON "offers"("currentPrice");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_isActive_offerScore_idx" ON "offers"("isActive", "offerScore" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offers_isActive_listingId_idx" ON "offers"("isActive", "listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "price_snapshots_offerId_capturedAt_idx" ON "price_snapshots"("offerId", "capturedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_offerId_idx" ON "clickouts"("offerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_clickedAt_idx" ON "clickouts"("clickedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_sourceSlug_idx" ON "clickouts"("sourceSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_sourceSlug_clickedAt_idx" ON "clickouts"("sourceSlug", "clickedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_offerId_clickedAt_idx" ON "clickouts"("offerId", "clickedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_pageType_clickedAt_idx" ON "clickouts"("pageType", "clickedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_channelOrigin_clickedAt_idx" ON "clickouts"("channelOrigin", "clickedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clickouts_campaignId_idx" ON "clickouts"("campaignId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_logs_normalizedQuery_idx" ON "search_logs"("normalizedQuery");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_logs_createdAt_idx" ON "search_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_logs_query_idx" ON "search_logs"("query");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "search_logs_normalizedQuery_createdAt_idx" ON "search_logs"("normalizedQuery", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "editorial_blocks_slug_key" ON "editorial_blocks"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "job_runs_jobName_startedAt_idx" ON "job_runs"("jobName", "startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "price_alerts_email_idx" ON "price_alerts"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "price_alerts_isActive_idx" ON "price_alerts"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "price_alerts_listingId_idx" ON "price_alerts"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "price_alerts_email_isActive_idx" ON "price_alerts"("email", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "price_alerts_isActive_listingId_idx" ON "price_alerts"("isActive", "listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trending_keywords_fetchedAt_idx" ON "trending_keywords"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "trending_keywords_keyword_fetchedAt_key" ON "trending_keywords"("keyword", "fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "articles_slug_key" ON "articles"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "articles_status_publishedAt_idx" ON "articles"("status", "publishedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "articles_category_idx" ON "articles"("category");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_code_key" ON "referrals"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_code_idx" ON "referrals"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_email_key" ON "subscribers"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscribers_status_idx" ON "subscribers"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscribers_source_idx" ON "subscribers"("source");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_logs_template_idx" ON "email_logs"("template");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "banners_isActive_bannerType_priority_idx" ON "banners"("isActive", "bannerType", "priority" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_candidates_status_idx" ON "catalog_candidates"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_candidates_importBatchId_idx" ON "catalog_candidates"("importBatchId");

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchants_sourceId_fkey') THEN ALTER TABLE "merchants" ADD CONSTRAINT "merchants_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_parentId_fkey') THEN ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_brandId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_categoryId_fkey') THEN ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_variants_productId_fkey') THEN ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_sourceId_fkey') THEN ALTER TABLE "listings" ADD CONSTRAINT "listings_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_merchantId_fkey') THEN ALTER TABLE "listings" ADD CONSTRAINT "listings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_productId_fkey') THEN ALTER TABLE "listings" ADD CONSTRAINT "listings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_variantId_fkey') THEN ALTER TABLE "listings" ADD CONSTRAINT "listings_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offers_listingId_fkey') THEN ALTER TABLE "offers" ADD CONSTRAINT "offers_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_snapshots_offerId_fkey') THEN ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_sourceId_fkey') THEN ALTER TABLE "coupons" ADD CONSTRAINT "coupons_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clickouts_offerId_fkey') THEN ALTER TABLE "clickouts" ADD CONSTRAINT "clickouts_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_alerts_listingId_fkey') THEN ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$;

-- AddForeignKey
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'catalog_candidates_importBatchId_fkey') THEN ALTER TABLE "catalog_candidates" ADD CONSTRAINT "catalog_candidates_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$;

