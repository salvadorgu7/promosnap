// ============================================================================
// Import Pipeline v2 — unified, normalized, idempotent, traceable
// ============================================================================

import prisma from '@/lib/db/prisma'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImportItem {
  externalId: string
  title: string
  currentPrice: number
  originalPrice?: number
  productUrl: string
  imageUrl?: string
  isFreeShipping?: boolean
  availability?: 'in_stock' | 'out_of_stock' | 'unknown'
  soldQuantity?: number
  condition?: string
  brand?: string           // Pre-detected brand name
  categorySlug?: string    // Resolved category slug
  sourceSlug: string       // e.g. 'mercadolivre', 'amazon'
  discoverySource?: string // "ml_discovery" | "ml_highlights" | "manual_import" | "csv_upload" | "admin"
}

export interface ImportItemResult {
  externalId: string
  action: 'created' | 'updated' | 'skipped' | 'failed'
  productId?: string
  reason?: string
}

export interface ImportPipelineResult {
  created: number
  updated: number
  skipped: number
  failed: number
  total: number
  items: ImportItemResult[]
  durationMs: number
  sourceSlug: string
}

// ── Normalization ──────────────────────────────────────────────────────────

const KNOWN_BRANDS = [
  'apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'jbl', 'philips',
  'dell', 'lenovo', 'asus', 'hp', 'acer', 'huawei', 'realme', 'oppo',
  'bose', 'logitech', 'corsair', 'razer', 'microsoft', 'nintendo', 'google',
  'amazon', 'anker', 'hyperx', 'akg', 'sennheiser', 'wacom', 'canon', 'nikon',
  'gopro', 'garmin', 'fitbit', 'oneplus', 'nothing', 'poco', 'redmi',
  'tcl', 'hisense', 'roku', 'epson', 'brother', 'kindle', 'echo',
]

function detectBrand(title: string): string | null {
  const lower = title.toLowerCase()
  return KNOWN_BRANDS.find(b => lower.includes(b)) ?? null
}

function generateSlug(title: string, suffix: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
    + '-' + suffix
}

function validateItem(item: ImportItem): string | null {
  if (!item.externalId) return 'Missing externalId'
  if (!item.title || item.title.trim().length < 3) return 'Title too short or missing'
  if (!item.currentPrice || item.currentPrice <= 0) return 'Invalid price'
  if (!item.productUrl) return 'Missing productUrl'
  if (!item.sourceSlug) return 'Missing sourceSlug'
  return null
}

// ── Core Pipeline ──────────────────────────────────────────────────────────

/**
 * Import items into the PromoSnap catalog.
 * Handles: validation, normalization, brand detection, dedup, upsert.
 * Fully idempotent — safe to re-run with same data.
 */
export async function runImportPipeline(
  items: ImportItem[],
  options?: { dryRun?: boolean }
): Promise<ImportPipelineResult> {
  const start = Date.now()
  const results: ImportItemResult[] = []
  let created = 0, updated = 0, skipped = 0, failed = 0

  if (items.length === 0) {
    return { created, updated, skipped, failed, total: 0, items: results, durationMs: 0, sourceSlug: '' }
  }

  const sourceSlug = items[0].sourceSlug

  // Ensure source exists
  let source = await prisma.source.findUnique({ where: { slug: sourceSlug } })
  if (!source) {
    const sourceName = sourceSlug.charAt(0).toUpperCase() + sourceSlug.slice(1).replace(/-/g, ' ')
    source = await prisma.source.create({
      data: { name: sourceName, slug: sourceSlug, status: 'ACTIVE' },
    })
  }

  for (const item of items) {
    try {
      // Validate
      const validationError = validateItem(item)
      if (validationError) {
        results.push({ externalId: item.externalId || 'unknown', action: 'skipped', reason: validationError })
        skipped++
        continue
      }

      if (options?.dryRun) {
        results.push({ externalId: item.externalId, action: 'skipped', reason: 'dry-run' })
        skipped++
        continue
      }

      // Check existing listing
      const existing = await prisma.listing.findUnique({
        where: { sourceId_externalId: { sourceId: source.id, externalId: item.externalId } },
        include: { offers: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
      })

      if (existing) {
        // Update existing
        const lastOffer = existing.offers[0]
        if (lastOffer && lastOffer.currentPrice !== item.currentPrice) {
          await prisma.offer.update({
            where: { id: lastOffer.id },
            data: {
              currentPrice: item.currentPrice,
              originalPrice: item.originalPrice ?? null,
              isFreeShipping: item.isFreeShipping ?? false,
              lastSeenAt: new Date(),
            },
          })
          await prisma.priceSnapshot.create({
            data: {
              offerId: lastOffer.id,
              price: item.currentPrice,
              originalPrice: item.originalPrice ?? null,
            },
          })
          // Update importedAt on re-import
          if (existing.productId) {
            await prisma.product.update({
              where: { id: existing.productId },
              data: { importedAt: new Date() },
            })
          }
          results.push({ externalId: item.externalId, action: 'updated', productId: existing.productId ?? undefined })
          updated++
        } else {
          // Same price — just touch lastSeenAt
          if (lastOffer) {
            await prisma.offer.update({
              where: { id: lastOffer.id },
              data: { lastSeenAt: new Date() },
            })
          }
          results.push({ externalId: item.externalId, action: 'skipped', reason: 'price unchanged' })
          skipped++
        }
        continue
      }

      // New item — detect brand
      const brandName = item.brand || detectBrand(item.title)
      let brandId: string | null = null
      if (brandName) {
        const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-')
        const brand = await prisma.brand.upsert({
          where: { slug: brandSlug },
          create: { name: brandName.charAt(0).toUpperCase() + brandName.slice(1), slug: brandSlug },
          update: {},
        })
        brandId = brand.id
      }

      // Resolve category
      let categoryId: string | null = null
      if (item.categorySlug) {
        const cat = await prisma.category.findUnique({ where: { slug: item.categorySlug } })
        if (cat) categoryId = cat.id
      }

      // Slug
      const slug = generateSlug(item.title, item.externalId.slice(-6).toLowerCase())

      // Find or create product
      let dbProduct = await prisma.product.findFirst({
        where: { slug: { startsWith: slug.slice(0, 60) } },
      })

      if (!dbProduct) {
        dbProduct = await prisma.product.create({
          data: {
            name: item.title,
            slug,
            imageUrl: item.imageUrl ?? null,
            brandId,
            categoryId,
            status: 'ACTIVE',
            originType: 'imported',
            discoverySource: item.discoverySource ?? 'ml_discovery',
            importedAt: new Date(),
          },
        })
      }

      // Create listing
      const listing = await prisma.listing.create({
        data: {
          sourceId: source.id,
          productId: dbProduct.id,
          externalId: item.externalId,
          rawTitle: item.title,
          productUrl: item.productUrl,
          imageUrl: item.imageUrl ?? null,
          availability: (item.availability === 'in_stock') ? 'IN_STOCK' : 'OUT_OF_STOCK',
          status: 'ACTIVE',
        },
      })

      // Create offer + snapshot
      const offer = await prisma.offer.create({
        data: {
          listingId: listing.id,
          currentPrice: item.currentPrice,
          originalPrice: item.originalPrice ?? null,
          isFreeShipping: item.isFreeShipping ?? false,
          isActive: true,
        },
      })

      await prisma.priceSnapshot.create({
        data: {
          offerId: offer.id,
          price: item.currentPrice,
          originalPrice: item.originalPrice ?? null,
        },
      })

      results.push({ externalId: item.externalId, action: 'created', productId: dbProduct.id })
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ externalId: item.externalId || 'unknown', action: 'failed', reason: msg })
      failed++
    }
  }

  const durationMs = Date.now() - start
  console.log(`[import-pipeline] source=${sourceSlug} created=${created} updated=${updated} skipped=${skipped} failed=${failed} total=${items.length} ${durationMs}ms`)

  return { created, updated, skipped, failed, total: items.length, items: results, durationMs, sourceSlug }
}
