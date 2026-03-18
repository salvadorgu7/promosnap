// ============================================================================
// Import Pipeline v2 — unified, normalized, idempotent, traceable
// ============================================================================

import prisma from '@/lib/db/prisma'
import type { Source } from '@prisma/client'
import { canonicalMatch } from '@/lib/catalog/canonical-match'
import { KNOWN_BRANDS as SHARED_BRANDS, BRAND_CASING as SHARED_BRAND_CASING, detectBrand as sharedDetectBrand } from '@/lib/brands'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'import-pipeline' })

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
  category?: string
  title?: string
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

// Re-export from shared brands module (single source of truth)
const KNOWN_BRANDS = SHARED_BRANDS

/** Noise suffixes commonly appended by ML listings */
const TITLE_NOISE = [
  /\s*[-–|]\s*envio\s+gr[aá]tis\s*$/i,
  /\s*[-–|]\s*frete\s+gr[aá]tis\s*$/i,
  /\s*[-–|]\s*full\s*$/i,
  /\s*[-–|]\s*original\s*$/i,
  /\s*[-–|]\s*12x\s+sem\s+juros\s*$/i,
]

// Re-export from shared brands module (single source of truth)
const BRAND_CASING = SHARED_BRAND_CASING

/** Clean up title before saving */
function normalizeTitle(raw: string): string {
  let title = raw
    // Remove lone surrogates / broken emoji (cause Prisma JSON errors)
    // eslint-disable-next-line no-control-regex
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    // Remove common emoji blocks that add noise to product titles
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '')
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

// Use shared brand detection (handles aliases + word boundaries)
const detectBrand = sharedDetectBrand

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

/** Compute a basic offer score (0–100) for ranking purposes */
function computeOfferScore(item: ImportItem): number {
  let score = 0

  // Discount component (up to 35 pts)
  if (item.originalPrice && item.originalPrice > item.currentPrice) {
    const discount = (item.originalPrice - item.currentPrice) / item.originalPrice
    score += Math.min(discount * 100, 40) * 0.875
  }

  // Price attractiveness — lower price = more appealing for impulse buys (up to 15 pts)
  if (item.currentPrice < 200) score += 15
  else if (item.currentPrice < 500) score += 12
  else if (item.currentPrice < 1500) score += 8
  else score += 4

  // Free shipping bonus (10 pts)
  if (item.isFreeShipping) score += 10

  // Has image (5 pts)
  if (item.imageUrl) score += 5

  // In stock (5 pts)
  if (item.availability === 'in_stock') score += 5

  // Freshness bonus — newly imported (10 pts)
  score += 10

  // Base score for having valid data (up to 20 pts)
  score += 20

  return Math.min(100, Math.round(score))
}

/** Reject titles that are pure marketing copy / not real product names */
const SPAM_TITLE_PATTERNS = [
  // Generic promo phrases (Portuguese)
  /^(?:vejas?|confira|aproveite|olha|descubra)\s+(?:nossas?|as|os|essas?|esses?)\s+(?:promo[çc][õo]es|ofertas|descontos|produtos)/i,
  /^(?:nossas?|melhores?)\s+(?:promo[çc][õo]es|ofertas|descontos)/i,
  /^(?:promo[çc][õo]es?\s+(?:do\s+dia|da\s+semana|imperd[íi]veis?))/i,
  /^(?:link\s+na\s+bio|compre\s+(?:aqui|agora|j[áa])|clique\s+aqui)/i,
  /^(?:grupo?\s+(?:de\s+)?(?:promo[çc][õo]es|ofertas|descontos))/i,
  /^(?:entre\s+no\s+grupo|participe\s+do\s+grupo)/i,
  /^(?:siga\s+(?:nosso|o)\s+(?:canal|grupo|perfil))/i,
  // Too short after normalization — likely leftover marketing fragments
  /^(?:oferta|promo|baixou|corre|confira|aproveite|imperd[íi]vel|rel[âa]mpago)$/i,
]

function isSpamTitle(title: string): boolean {
  const normalized = title
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Title with fewer than 2 real words (non-stopword) is likely spam
  const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'a', 'o', 'no', 'na', 'as', 'os', 'um', 'uma', 'se', 'ou', 'ao', 'nos', 'nas', 'que', 'la'])
  const words = normalized.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !STOPWORDS.has(w))
  if (words.length < 2) return true

  // Match against known spam patterns
  for (const pattern of SPAM_TITLE_PATTERNS) {
    if (pattern.test(normalized)) return true
  }

  return false
}

function validateItem(item: ImportItem): string | null {
  if (!item.externalId) return 'Missing externalId'
  if (!item.title || item.title.trim().length < 3) return 'Title too short or missing'
  if (item.title.length > 500) {
    item.title = item.title.slice(0, 500)
    log.warn('validation.title-truncated', { externalId: item.externalId })
  }
  // Reject titles that are pure marketing copy
  if (isSpamTitle(item.title)) {
    log.warn('validation.spam-title', { externalId: item.externalId, title: item.title })
    return 'Title is promotional/marketing copy, not a product name'
  }
  if (!item.currentPrice || item.currentPrice <= 0) return 'Invalid price'
  if (item.currentPrice > 500_000) return 'Price suspiciously high (>R$500k)'
  // Catch parse errors where a measurement (e.g. "1,10m") is mistaken for price
  if (item.currentPrice < 2 && item.originalPrice && item.originalPrice > 50) {
    return `Price R$${item.currentPrice} with original R$${item.originalPrice} — likely parse error (measurement as price)`
  }
  if (!item.productUrl) return 'Missing productUrl'
  try {
    const url = new URL(item.productUrl)
    if (!['http:', 'https:'].includes(url.protocol)) return 'Invalid URL protocol'
  } catch {
    return 'Invalid productUrl format'
  }
  if (item.imageUrl) {
    try {
      const imgUrl = new URL(item.imageUrl)
      if (!['http:', 'https:'].includes(imgUrl.protocol)) {
        // Clear invalid image URL silently — not a fatal error
        item.imageUrl = undefined
      }
    } catch {
      item.imageUrl = undefined
    }
  }
  if (!item.sourceSlug) return 'Missing sourceSlug'
  // Normalize originalPrice: must be > currentPrice, otherwise discard
  if (item.originalPrice && item.originalPrice <= item.currentPrice) {
    item.originalPrice = undefined
  }
  // Normalize price to 2 decimal places
  item.currentPrice = Math.round(item.currentPrice * 100) / 100
  if (item.originalPrice) {
    item.originalPrice = Math.round(item.originalPrice * 100) / 100
  }
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
    log.warn('batch.truncated', { max: MAX_BATCH_SIZE, received: originalLength })
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

  // Ensure source exists — cache per slug to support mixed-source batches (e.g. WhatsApp with ML + Shopee)
  const sourceCache: Record<string, Source> = {}
  async function getOrCreateSource(slug: string): Promise<Source> {
    if (sourceCache[slug]) return sourceCache[slug]!
    let s = await prisma.source.findUnique({ where: { slug } })
    if (!s) {
      const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
      s = await prisma.source.create({ data: { name, slug, status: 'ACTIVE' } })
    }
    sourceCache[slug] = s
    return s
  }

  let source = await getOrCreateSource(sourceSlug)

  for (const item of items) {
    try {
      // Resolve per-item source (supports mixed-source batches like WhatsApp)
      const itemSource = item.sourceSlug !== sourceSlug
        ? await getOrCreateSource(item.sourceSlug)
        : source

      // Validate
      const validationError = validateItem(item)
      if (validationError) {
        log.warn('validation.failed', { externalId: item.externalId || 'unknown', reason: validationError })
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
        where: { sourceId_externalId: { sourceId: itemSource.id, externalId: item.externalId } },
        include: { offers: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, currentPrice: true, offerScore: true } } },
      })

      if (existing) {
        // Update existing — also backfill category/brand if missing
        if (existing.productId) {
          const productUpdate: Record<string, unknown> = {}

          // Backfill categoryId if product has none and we now have one
          if (item.categorySlug) {
            const cat = await prisma.category.upsert({
              where: { slug: item.categorySlug },
              create: {
                name: item.categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                slug: item.categorySlug,
              },
              update: {},
            })
            const existingProduct = await prisma.product.findUnique({ where: { id: existing.productId }, select: { categoryId: true, brandId: true } })
            if (existingProduct && !existingProduct.categoryId) {
              productUpdate.categoryId = cat.id
              catsResolved++
            } else if (existingProduct?.categoryId) {
              catsResolved++
            } else {
              catsUnresolved++
            }

            // Backfill brandId if product has none
            if (existingProduct && !existingProduct.brandId) {
              const brandName = item.brand || detectBrand(item.title)
              if (brandName) {
                const brandSlug = brandName.toLowerCase().replace(/\s+/g, '-')
                const normalizedBrand = brandName.charAt(0).toUpperCase() + brandName.slice(1)
                const brand = await prisma.brand.upsert({
                  where: { slug: brandSlug },
                  create: { name: normalizedBrand, slug: brandSlug },
                  update: {},
                })
                productUpdate.brandId = brand.id
                brandsDetected++
              }
            }
          } else {
            catsUnresolved++
          }

          const lastOffer = existing.offers[0]
          const newOfferScore = computeOfferScore(item)

          // Backfill offerScore if it's 0 (legacy data)
          if (lastOffer && lastOffer.offerScore === 0 && newOfferScore > 0) {
            await prisma.offer.update({
              where: { id: lastOffer.id },
              data: { offerScore: newOfferScore, lastSeenAt: new Date() },
            })
            productUpdate.importedAt = new Date()
          }

          if (lastOffer && lastOffer.currentPrice !== item.currentPrice) {
            await prisma.offer.update({
              where: { id: lastOffer.id },
              data: {
                currentPrice: item.currentPrice,
                originalPrice: item.originalPrice ?? null,
                isFreeShipping: item.isFreeShipping ?? false,
                offerScore: newOfferScore,
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
            productUpdate.importedAt = new Date()
            await prisma.product.update({
              where: { id: existing.productId },
              data: productUpdate,
            })
            results.push({ externalId: item.externalId, action: 'updated', productId: existing.productId, category: item.categorySlug, title: item.title })
            updated++
          } else {
            // Same price — just touch lastSeenAt, but still backfill category/brand
            if (lastOffer) {
              await prisma.offer.update({
                where: { id: lastOffer.id },
                data: { lastSeenAt: new Date() },
              })
            }
            if (Object.keys(productUpdate).length > 0) {
              await prisma.product.update({
                where: { id: existing.productId },
                data: productUpdate,
              })
              results.push({ externalId: item.externalId, action: 'updated', productId: existing.productId, reason: 'backfill category/brand', category: item.categorySlug, title: item.title })
              updated++
            } else {
              results.push({ externalId: item.externalId, action: 'skipped', reason: 'price unchanged', category: item.categorySlug, title: item.title })
              skipped++
            }
          }
        } else {
          results.push({ externalId: item.externalId, action: 'skipped', reason: 'no productId', category: item.categorySlug, title: item.title })
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
              log.info('canonical.match', { title: cleanTitle, matchedTo: match.productName, score: match.score.toFixed(2), confidence: match.confidence, via: match.matchedOn.join(',') })
            }
          }
        } catch (err) {
          // Canonical match is optional — log and continue without it
          log.warn('canonical.skipped', { externalId: item.externalId, error: err instanceof Error ? err.message : err })
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

      // Auto-heal: backfill product image from listing if product has none
      if (dbProduct && !dbProduct.imageUrl && item.imageUrl) {
        await prisma.product.update({
          where: { id: dbProduct.id },
          data: { imageUrl: item.imageUrl },
        })
        dbProduct = { ...dbProduct, imageUrl: item.imageUrl }
      }

      // Last-resort image fetch: if product STILL has no image and has an ML ID, try API directly
      if (dbProduct && !dbProduct.imageUrl && item.externalId?.startsWith('MLB')) {
        try {
          const mlRes = await fetch(
            `https://api.mercadolibre.com/items/${item.externalId}?attributes=thumbnail,pictures`,
            { signal: AbortSignal.timeout(4000) }
          )
          if (mlRes.ok) {
            const mlData = await mlRes.json()
            const fetchedImage =
              mlData.pictures?.[0]?.secure_url ||
              mlData.pictures?.[0]?.url ||
              (mlData.thumbnail ? mlData.thumbnail.replace(/-I\.jpg$/, '-O.jpg') : null)
            if (fetchedImage && fetchedImage.length > 5) {
              await prisma.product.update({
                where: { id: dbProduct.id },
                data: { imageUrl: fetchedImage },
              })
              item.imageUrl = fetchedImage
              dbProduct = { ...dbProduct, imageUrl: fetchedImage }
            }
          }
        } catch {
          // Non-blocking — image fetch is best-effort
        }
      }

      // Create listing
      const listing = await prisma.listing.create({
        data: {
          sourceId: itemSource.id,
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

      // Backfill product image from listing if product still has no image
      if (!dbProduct.imageUrl && item.imageUrl) {
        await prisma.product.update({
          where: { id: dbProduct.id },
          data: { imageUrl: item.imageUrl },
        })
        dbProduct = { ...dbProduct, imageUrl: item.imageUrl }
      }

      // Create offer + snapshot
      // Build affiliate URL using adapter when available, fallback to raw product URL
      // Strip third-party affiliate params that leak from WhatsApp messages
      let affiliateUrl = item.productUrl || null
      if (affiliateUrl && affiliateUrl.startsWith('http')) {
        try {
          const urlObj = new URL(affiliateUrl)
          // Remove third-party tracking/affiliate params before building our own
          const THIRD_PARTY_PARAMS = [
            'matt_tool', 'matt_word', 'matt_source', 'matt_campaign',
            'forceInApp', 'deal_print_id', 'promotion_id',
            'ref', 'fbclid', 'gclid',
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
          ]
          for (const param of THIRD_PARTY_PARAMS) {
            urlObj.searchParams.delete(param)
          }
          affiliateUrl = urlObj.toString()
        } catch {
          // URL parsing failed — continue with raw URL
        }
      }
      if (affiliateUrl && affiliateUrl.startsWith('http')) {
        try {
          const adapterMap: Record<string, () => Promise<{ buildAffiliateUrl: (url: string) => string }>> = {
            'mercadolivre': async () => {
              const { MercadoLivreAdapter } = await import('@/adapters/mercadolivre')
              return new MercadoLivreAdapter()
            },
            'amazon-br': async () => {
              const { AmazonAdapter } = await import('@/adapters/amazon')
              return new AmazonAdapter()
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
        log.warn('no-affiliate-url', { title: cleanTitle })
        noAffiliateUrl++
      }
      const offerScore = computeOfferScore(item)
      const offer = await prisma.offer.create({
        data: {
          listingId: listing.id,
          currentPrice: item.currentPrice,
          originalPrice: item.originalPrice ?? null,
          isFreeShipping: item.isFreeShipping ?? false,
          affiliateUrl,
          isActive: true,
          offerScore,
        },
      })

      await prisma.priceSnapshot.create({
        data: {
          offerId: offer.id,
          price: item.currentPrice,
          originalPrice: item.originalPrice ?? null,
        },
      })

      results.push({ externalId: item.externalId, action: 'created', productId: dbProduct.id, category: item.categorySlug, title: item.title })
      created++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ externalId: item.externalId || 'unknown', action: 'failed', reason: msg, category: item.categorySlug, title: item.title })
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

  // Batch summary log
  const existingCount = results.filter(r => r.action === 'updated' || (r.action === 'skipped' && r.reason === 'price unchanged')).length
  const newCount = results.filter(r => r.action === 'created').length
  const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', ')
  const topCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(', ')

  log.info('batch.complete', {
    source: sourceSlug, created, updated, skipped, failed,
    existing: existingCount, new: newCount, canonicalMatches,
    noAffiliateUrl, brands: topBrands, categories: topCats,
    priceRange: prices.length > 0 ? `R$${priceStats.min.toFixed(0)}-R$${priceStats.max.toFixed(0)}` : 'n/a',
    durationMs,
  })

  return { created, updated, skipped, failed, total: items.length, items: results, durationMs, sourceSlug, noAffiliateUrl, brandStats, categoryStats, priceStats }
}
