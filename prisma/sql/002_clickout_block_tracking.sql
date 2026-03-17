-- Add block-level tracking fields to Clickout (commercial decision intelligence)
-- Safe to re-run: uses IF NOT EXISTS

ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "blockId" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "positionInBlock" INTEGER;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "recommendationType" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT;

-- Attribution fields (may already exist from previous deploy)
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "pageType" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "channelOrigin" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "bannerId" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "productId" TEXT;
ALTER TABLE "Clickout" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

-- Product origin tracking (may already exist)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originType" TEXT NOT NULL DEFAULT 'seed';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discoverySource" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Product_originType_idx" ON "Product"("originType");
