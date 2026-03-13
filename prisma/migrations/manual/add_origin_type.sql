-- Add origin tracking to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "originType" TEXT NOT NULL DEFAULT 'seed';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discoverySource" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Product_originType_idx" ON "Product"("originType");

-- Mark existing imported products (those with ML listings) as imported
UPDATE "Product" SET "originType" = 'imported', "discoverySource" = 'ml_discovery', "importedAt" = NOW()
WHERE id IN (
  SELECT DISTINCT "productId" FROM "Listing"
  WHERE "sourceId" IN (SELECT id FROM "Source" WHERE slug = 'mercadolivre')
);
