import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import {
  extractAsinFromUrl,
  extractTitleFromUrl,
  isValidAsin,
  isAmazonUrl,
  buildAmazonProductUrl,
  buildAmazonAffiliateUrl,
  AMAZON_TRACKING_TAG,
} from '@/lib/amazon/strategy'

// ─── Types ──────────────────────────────────────────────────────────────────

interface AmazonProductInput {
  /** Amazon URL or ASIN */
  url?: string
  asin?: string
  /** Required: product title */
  title: string
  /** Required: current price in BRL */
  price: number
  /** Optional: original/list price */
  originalPrice?: number
  /** Optional: image URL */
  imageUrl?: string
  /** Optional: category slug */
  category?: string
  /** Optional: brand */
  brand?: string
  /** Optional: availability */
  availability?: 'in_stock' | 'out_of_stock' | 'unknown'
}

interface ParsedProduct {
  asin: string
  title: string
  price: number
  originalPrice?: number
  imageUrl?: string
  category?: string
  brand?: string
  productUrl: string
  affiliateUrl: string
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
}

// ─── POST /api/admin/ingest-amazon ──────────────────────────────────────────

/**
 * Manual Amazon product import.
 * Accepts products with Amazon URLs/ASINs + title + price.
 * Creates real listings with affiliate tag via the canonical import pipeline.
 *
 * Body: { products: AmazonProductInput[] }
 */
export async function POST(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'admin')
  if (!rl.success) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const products: AmazonProductInput[] = body.products

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Campo "products" obrigatório (array de produtos Amazon)' },
        { status: 400 }
      )
    }

    if (products.length > 100) {
      return NextResponse.json(
        { error: 'Máximo 100 produtos por batch' },
        { status: 400 }
      )
    }

    // ── Parse and validate each product ──────────────────────────────────

    const parsed: ParsedProduct[] = []
    const errors: Array<{ index: number; error: string }> = []

    for (let i = 0; i < products.length; i++) {
      const p = products[i]

      // Validate required fields
      if (!p.title || typeof p.title !== 'string' || p.title.trim().length < 3) {
        errors.push({ index: i, error: 'title obrigatório (min 3 chars)' })
        continue
      }
      if (!p.price || typeof p.price !== 'number' || p.price <= 0) {
        errors.push({ index: i, error: 'price obrigatório (número > 0)' })
        continue
      }

      // Resolve ASIN
      let asin: string | null = null
      if (p.asin && isValidAsin(p.asin)) {
        asin = p.asin.toUpperCase()
      } else if (p.url) {
        if (isAmazonUrl(p.url)) {
          asin = extractAsinFromUrl(p.url)
        } else {
          errors.push({ index: i, error: `URL não é Amazon: ${p.url}` })
          continue
        }
      }

      if (!asin) {
        errors.push({ index: i, error: 'ASIN não encontrado — forneça url Amazon ou asin válido' })
        continue
      }

      // Build URLs
      const productUrl = buildAmazonProductUrl(asin)
      const affiliateUrl = buildAmazonAffiliateUrl(productUrl)

      // Try to enrich title from URL if provided title is short
      let title = p.title.trim()
      if (title.length < 10 && p.url) {
        const urlTitle = extractTitleFromUrl(p.url)
        if (urlTitle && urlTitle.length > title.length) {
          title = urlTitle
        }
      }

      parsed.push({
        asin,
        title,
        price: p.price,
        originalPrice: p.originalPrice,
        imageUrl: p.imageUrl,
        category: p.category,
        brand: p.brand,
        productUrl,
        affiliateUrl,
        availability: p.availability ?? 'in_stock',
      })
    }

    if (parsed.length === 0) {
      return NextResponse.json({
        error: 'Nenhum produto válido para importar',
        validationErrors: errors,
      }, { status: 400 })
    }

    // ── Convert to ImportItems and run pipeline ─────────────────────────

    const importItems: ImportItem[] = parsed.map(p => ({
      externalId: p.asin,
      title: p.title,
      currentPrice: p.price,
      originalPrice: p.originalPrice,
      productUrl: p.affiliateUrl, // Use affiliate URL as primary
      imageUrl: p.imageUrl,
      isFreeShipping: undefined,
      availability: p.availability,
      brand: p.brand,
      categorySlug: p.category,
      sourceSlug: 'amazon-br',
      discoverySource: 'manual_amazon_import',
    }))

    const result = await runImportPipeline(importItems)

    return NextResponse.json({
      mode: 'amazon-manual',
      tag: AMAZON_TRACKING_TAG,
      fetched: parsed.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed + errors.length,
      durationMs: result.durationMs,
      validationErrors: errors.length > 0 ? errors : undefined,
      brandStats: result.brandStats,
      categoryStats: result.categoryStats,
      priceStats: result.priceStats,
      importedItems: result.items?.map(item => ({
        externalId: item.externalId,
        action: item.action,
        productId: item.productId,
        reason: item.reason,
        title: item.title,
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Import failed: ${msg}` },
      { status: 500 }
    )
  }
}
