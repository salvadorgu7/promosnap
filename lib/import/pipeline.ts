// ============================================================================
// Import Pipeline v2 — unified, normalized, idempotent, traceable
// ============================================================================

import prisma from '@/lib/db/prisma'
import { canonicalMatch } from '@/lib/catalog/canonical-match'

/** Maximum number of items allowed per batch import to prevent memory/timeout issues */
export const MAX_BATCH_SIZE = 500

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
  noAffiliateUrl: number
  brandStats: { detected: number; unknown: number }
  categoryStats: { resolved: number; unresolved: number }
  priceStats: { min: number; max: number; avg: number }
}

// ── Normalization ──────────────────────────────────────────────────────────

const KNOWN_BRANDS = [
  'apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'jbl', 'philips',
  'dell', 'lenovo', 'asus', 'hp', 'acer', 'huawei', 'realme', 'oppo',
  'bose', 'logitech', 'corsair', 'razer', 'microsoft', 'nintendo', 'google',
  'amazon', 'anker', 'hyperx', 'akg', 'sennheiser', 'wacom', 'canon', 'nikon',
  'gopro', 'garmin', 'fitbit', 'oneplus', 'nothing', 'poco', 'redmi',
  'tcl', 'hisense', 'roku', 'epson', 'brother', 'kindle', 'echo',
  // Brazilian electronics brands
  'positivo', 'multilaser', 'mondial', 'electrolux', 'brastemp', 'consul',
  'tramontina', 'intelbras', 'cadence', 'philco', 'britania', 'walita', 'arno', 'oster',
]

/** Noise suffixes commonly appended by ML listings */
const TITLE_NOISE = [
  /\s*[-–|]\s*envio\s+gr[aá]tis\s*$/i,
  /\s*[-–|]\s*frete\s+gr[aá]tis\s*$/i,
  /\s*[-–|]\s*full\s*$/i,
  /\s*[-–|]\s*original\s*$/i,
  /\s*[-–|]\s*12x\s+sem\s+juros\s*$/i,
]

/** Brands that should keep their original casing (not be title-cased) */
const BRAND_CASING: Record<string, string> = {
  iphone: 'iPhone', ipad: 'iPad', macbook: 'MacBook', airpods: 'AirPods',
  playstation: 'PlayStation', xbox: 'Xbox', jbl: 'JBL', lg: 'LG', hp: 'HP',
  ssd: 'SSD', led: 'LED', '4k': '4K', hd: 'HD', usb: 'USB', hdmi: 'HDMI',
}

/** Clean up title before saving */
function normalizeTitle(raw: string): string {
  let title = raw
    // Collapse excessive whitespace
    .replace(/\s{2,}/g, ' ')
    .trim()

  // Remove ML noise suffixes
  for (const pattern of TITLE_NOISE) {
    title = title.replace(pattern, '')
  }

  // Title-case major words, preserving known brand casings
  title = title
    .split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase()
      if (BRAND_CASING[lower]) return BRAND_CASING[lower]
      // Keep short prepositions/articles lowercase (Portuguese)
      if (['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'a', 'o', 'no', 'na'].includes(lower) && word !== raw.split(/\s+/)[0]) {
        return lower
      }
      // Already mixed-case brand/model (e.g. "iPhone") — keep as-is
      if (word.length > 1 && word !== lower && word !== word.toUpperCase()) return word
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')

  return title.trim()
}

function detectBrand(title: string): string | null {
  const lower = title.toLowerCase()
  return KNOWN_BRANDS.find(b => lower.includes(b)) ?? null
}

function generateSlug(title: string, suffix: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Truncate at word boundary (last '-' before position 120) instead of mid-word
  let truncated = base
  if (base.length > 120) {
    const lastDash = base.lastIndexOf('-', 120)
    truncated = lastDash > 40 ? base.slice(0, lastDash) : base.slice(0, 120)
  }

  return truncated + '-' + suffix
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
  // Enforce batch size limit to prevent memory/timeout issues
  if (items.length > MAX_BATCH_SIZE) {
    const originalLength = items.length
    items = items.slice(0, MAX_BATCH_SIZE)
    console.warn(`[import-pipeline] Batch truncated to ${MAX_BATCH_SIZE} items (received ${originalLength})`)
  }

  const start = Date.now()
  const results: ImportItemResult[] = []
  let created = 0, updated = 0, skipped = 0, failed = 0
  let noAffiliateUrl = 0
  let canonicalMatches = 0
  let brandsDetected = 0, brandsUnknown = 0
  let catsResolved = 0, catsUnresolved = 0
  const prices: number[] = []
  const brandCounts: Record<string, number> = {}
  const categoryCounts: Record<string, number> = {}

  const emptyStats = { detected: 0, unknown: 0 }
  const emptyPriceStats = { min: 0, max: 0, avg: 0 }

  if (items.length === 0) {
    return { created, updated, skipped, failed, total: 0, items: results, durationMs: 0, sourceSlug: '', noAffiliateUrl: 0, brandStats: emptyStats, categoryStats: { resolved: 0, unresolved: 0 }, priceStats: emptyPriceStats }
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
        console.warn(`[import-pipeline] validation failed: ${item.externalId || 'unknown'} — ${validationError}`)
        results.push({ externalId: item.externalId || 'unknown', action: 'skipped', reason: validationError })
        skipped++
        continue
      }

      // Track price stats
      if (item.currentPrice > 0) prices.push(item.currentPrice)

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

      // Normalize title before saving
      const cleanTitle = normalizeTitle(item.title)

      // New item — detect brand
      const brandName = item.brand || detectBrand(cleanTitle)
      let brandId: string | null = null
      if (brandName) {
        brandsDetected++
        const normalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1)
        brandCounts[normalizedBrand] = (brandCounts[normalizedBrand] || 0) + 1
        const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-')
        const brand = await prisma.brand.upsert({
          where: { slug: brandSlug },
          create: { name: normalizedBrand, slug: brandSlug },
          update: {},
        })
        brandId = brand.id
      } else {
        brandsUnknown++
      }

      // Resolve category (auto-create if slug provided but not yet in DB)
      let categoryId: string | null = null
      if (item.categorySlug) {
        const cat = await prisma.category.upsert({
          where: { slug: item.categorySlug },
          create: {
            name: item.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            slug: item.categorySlug,
          },
          update: {},
        })
        categoryId = cat.id
        catsResolved++
        categoryCounts[cat.name || item.categorySlug] = (categoryCounts[cat.name || item.categorySlug] || 0) + 1
      } else {
        catsUnresolved++
      }

      // Slug
      const slug = generateSlug(cleanTitle, item.externalId.slice(-6).toLowerCase())

      // Find or create product
      // Step 1: Try slug-based lookup (fast, exact match on same product re-import)
      let dbProduct = await prisma.product.findFirst({
        where: { slug: { startsWith: slug.slice(0, 60) } },
      })

      // Step 2: If no slug match, try canonical matching (fuzzy name/brand/model similarity)
      let matchConfidence: number | null = null
      if (!dbProduct) {
        try {
          const match = await canonicalMatch({
            rawTitle: item.title,
            rawBrand: brandName ?? null,
            rawCategory: item.categorySlug ?? null,
          })
          if (match && match.score >= 0.7) {
            // Strong enough match — reuse existing product
            dbProduct = await prisma.product.findUnique({ where: { id: match.productId } })
            if (dbProduct) {
              matchConfidence = match.score
              canonicalMatches++
              console.log(
                `[import-pipeline] canonical match: "${cleanTitle}" → "${match.productName}" (score=${match.score.toFixed(2)}, ${match.confidence}, via=${match.matchedOn.join(',')})`
              )
            }
          }
        } catch (err) {
          // Canonical match is optional — log and continue without it
          console.warn(`[import-pipeline] canonical match skipped for "${item.externalId}":`, err instanceof Error ? err.message : err)
        }
      }

      // Step 3: No match at all — create new product
      if (!dbProduct) {
        dbProduct = await prisma.product.create({
          data: {
            name: cleanTitle,
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
          ...(matchConfidence != null && { matchConfidence }),
        },
      })

      // Create offer + snapshot
      // Build affiliate URL using adapter when available, fallback to raw product URL
      let affiliateUrl = item.productUrl || null
      if (affiliateUrl && affiliateUrl.startsWith('http')) {
        try {
          const adapterMap: Record<string, () => Promise<{ buildAffiliateUrl: (url: string) => string }>> = {
            'mercadolivre': async () => {
              const { MercadoLivreAdapter } = await import('@/adapters/mercadolivre')
              return new MercadoLivreAdapter()
            },
          }
          const getAdapter = adapterMap[item.sourceSlug]
          if (getAdapter) {
            const adapter = await getAdapter()
            affiliateUrl = adapter.buildAffiliateUrl(affiliateUrl)
          }
        } catch {
          // Adapter unavailable or misconfigured — use raw URL
        }
      }
      const hasValidAffiliateUrl = !!affiliateUrl && affiliateUrl !== '#' && affiliateUrl.startsWith('http')
      if (!hasValidAffiliateUrl) {
        console.warn(`[import-pipeline] product "${cleanTitle}" has no valid affiliate URL`)
        noAffiliateUrl++
      }
      const offer = await prisma.offer.create({
        data: {
          listingId: listing.id,
          currentPrice: item.currentPrice,
          originalPrice: item.originalPrice ?? null,
          isFreeShipping: item.isFreeShipping ?? false,
          affiliateUrl,
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

  // Compute stats
  const brandStats = { detected: brandsDetected, unknown: brandsUnknown }
  const categoryStats = { resolved: catsResolved, unresolved: catsUnresolved }
  const priceStats = prices.length > 0
    ? { min: Math.min(...prices), max: Math.max(...prices), avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) }
    : emptyPriceStats

  // Dedup stats
  const existingCount = results.filter(r => r.action === 'updated' || (r.action === 'skipped' && r.reason === 'price unchanged')).length
  const newCount = results.filter(r => r.action === 'created').length
  console.log(`[import-pipeline] dedup: ${existingCount} existing, ${newCount} new, ${canonicalMatches} canonical-matched`)
  console.log(`[import-pipeline] brands: ${brandsDetected} detected, ${brandsUnknown} unknown`)
  console.log(`[import-pipeline] categories: ${catsResolved} resolved, ${catsUnresolved} unresolved`)
  if (prices.length > 0) {
    console.log(`[import-pipeline] prices: R$${priceStats.min.toFixed(0)}-R$${priceStats.max.toFixed(0)} avg=R$${priceStats.avg.toFixed(0)}`)
  }

  // Batch summary
  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', ')
  const topCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', ')
  console.log(`[import-pipeline] batch complete: source=${sourceSlug} created=${created} updated=${updated} skipped=${skipped} failed=${failed} noAffiliateUrl=${noAffiliateUrl} canonicalMatches=${canonicalMatches} brands=[${topBrands}] categories=[${topCats}] priceRange=R$${priceStats.min.toFixed(0)}-R$${priceStats.max.toFixed(0)}`)

  return { created, updated, skipped, failed, total: items.length, items: results, durationMs, sourceSlug, noAffiliateUrl, brandStats, categoryStats, priceStats }
}
