/**
 * lib/jobs/specs-enrich.ts — Auto-extract specs from product names
 *
 * Parses product titles to extract structured specifications:
 * - Storage (128GB, 256GB, 1TB, etc.)
 * - RAM (4GB, 8GB, 16GB, etc.)
 * - Screen size (6.1", 15.6", 55 polegadas, etc.)
 * - Color
 * - Processor model
 * - Battery capacity
 * - Camera specs
 *
 * Only updates products that have null or empty specsJson.
 * Safe to re-run — idempotent.
 */

import prisma from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { runJob, type JobResult } from '@/lib/jobs/runner'
import { extractStorage, extractColor, extractModel } from '@/lib/catalog/normalize'
import { logger } from '@/lib/logger'

const BATCH_SIZE = 500

// ── Extraction patterns ───────────────────────────────────────

function extractRAM(title: string): string | null {
  // Match RAM patterns: "8GB RAM", "16GB de RAM", "8 GB RAM"
  const match = title.match(/\b(\d+)\s*GB\s*(?:de\s*)?RAM\b/i)
  if (match) return `${match[1]}GB`

  // Match RAM in notebook context: "8GB DDR4", "16GB DDR5"
  const ddrMatch = title.match(/\b(\d+)\s*GB\s*DDR\d\b/i)
  if (ddrMatch) return `${ddrMatch[1]}GB`

  return null
}

function extractScreenSize(title: string): string | null {
  // Match: 6.1", 6,7 polegadas, 55", 15.6 pol, 32 polegadas
  const inchMatch = title.match(/\b(\d+[.,]\d+|\d+)\s*["''″]\b/)
  if (inchMatch) return `${inchMatch[1].replace(',', '.')}"`

  const polMatch = title.match(/\b(\d+[.,]\d+|\d+)\s*(?:polegadas?|pol\.?)\b/i)
  if (polMatch) return `${polMatch[1].replace(',', '.')}"`

  return null
}

function extractBattery(title: string): string | null {
  // Match: 5000mAh, 4.500 mAh, 5000 mAh
  const match = title.match(/\b(\d+[.,]?\d*)\s*mAh\b/i)
  if (match) return `${match[1].replace('.', '').replace(',', '')}mAh`
  return null
}

function extractCamera(title: string): string | null {
  // Match: 48MP, 50 MP, 108 megapixels
  const match = title.match(/\b(\d+)\s*(?:MP|megapixe[ls]?)\b/i)
  if (match) return `${match[1]}MP`
  return null
}

function extractProcessor(title: string): string | null {
  // Match common processor patterns
  const patterns = [
    /\b(Snapdragon\s+\d+\s*\w*)\b/i,
    /\b(Dimensity\s+\d+\w*)\b/i,
    /\b(Exynos\s+\d+)\b/i,
    /\b(A\d+\s*(?:Pro|Bionic)?)\s+chip\b/i,
    /\b(Apple\s+[AM]\d+(?:\s+Pro|\s+Max|\s+Ultra)?)\b/i,
    /\b(Intel\s+Core\s+i\d[\s\-]\d{4,5}\w?)\b/i,
    /\b(Ryzen\s+\d+\s+\d{4}\w?)\b/i,
    /\b(Celeron\s+\w+)\b/i,
    /\b(Pentium\s+\w+)\b/i,
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

function extractWeight(title: string): string | null {
  // Match: 180g, 1.5kg, 2,1 kg
  const gMatch = title.match(/\b(\d+)\s*g\b/i)
  if (gMatch && parseInt(gMatch[1]) > 50 && parseInt(gMatch[1]) < 2000) return `${gMatch[1]}g`

  const kgMatch = title.match(/\b(\d+[.,]\d+|\d+)\s*kg\b/i)
  if (kgMatch) return `${kgMatch[1].replace(',', '.')}kg`

  return null
}

function extractConnectivity(title: string): string[] {
  const conn: string[] = []
  const lower = title.toLowerCase()
  if (lower.includes('5g')) conn.push('5G')
  else if (lower.includes('4g') || lower.includes('lte')) conn.push('4G')
  if (lower.includes('wi-fi 6') || lower.includes('wifi 6')) conn.push('Wi-Fi 6')
  else if (lower.includes('wifi') || lower.includes('wi-fi')) conn.push('Wi-Fi')
  if (lower.includes('bluetooth')) conn.push('Bluetooth')
  if (lower.includes('nfc')) conn.push('NFC')
  if (lower.includes('usb-c') || lower.includes('usb c')) conn.push('USB-C')
  return conn
}

function extractResolution(title: string): string | null {
  const patterns = [
    /\b(4K|UHD)\b/i,
    /\b(Full\s*HD|FHD|1080p)\b/i,
    /\b(HD|720p)\b/i,
    /\b(8K)\b/i,
    /\b(2K|QHD|WQHD|1440p)\b/i,
  ]
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1].toUpperCase().replace(/\s+/g, '')
  }
  return null
}

// ── Main enrichment function ─────────────────────────────────

function extractSpecs(title: string): Record<string, unknown> {
  const specs: Record<string, unknown> = {}

  const storage = extractStorage(title)
  if (storage) specs.storage = storage

  const ram = extractRAM(title)
  if (ram) specs.ram = ram

  const screenSize = extractScreenSize(title)
  if (screenSize) specs.screenSize = screenSize

  const battery = extractBattery(title)
  if (battery) specs.battery = battery

  const camera = extractCamera(title)
  if (camera) specs.mainCamera = camera

  const processor = extractProcessor(title)
  if (processor) specs.processor = processor

  const color = extractColor(title)
  if (color) specs.color = color

  const model = extractModel(title)
  if (model) specs.model = model

  const weight = extractWeight(title)
  if (weight) specs.weight = weight

  const connectivity = extractConnectivity(title)
  if (connectivity.length > 0) specs.connectivity = connectivity

  const resolution = extractResolution(title)
  if (resolution) specs.resolution = resolution

  return specs
}

// ── Job ──────────────────────────────────────────────────────

export async function specsEnrich(): Promise<JobResult> {
  return runJob('specs-enrich', async (ctx) => {
    ctx.log('Starting specs enrichment...')

    // Find products with null or empty specsJson
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { specsJson: { equals: Prisma.JsonNull } },
          { specsJson: { equals: Prisma.DbNull } },
          { specsJson: { equals: {} } },
        ],
      },
      select: { id: true, name: true },
      take: BATCH_SIZE,
      orderBy: { popularityScore: 'desc' },
    })

    ctx.log(`Found ${products.length} products without specs`)

    if (products.length === 0) {
      return { itemsTotal: 0, itemsDone: 0, metadata: { enriched: 0, noSpecs: 0 } }
    }

    let enriched = 0
    let noSpecs = 0
    let errors = 0

    for (const product of products) {
      try {
        const specs = extractSpecs(product.name)

        // Only update if we found at least 1 spec
        if (Object.keys(specs).length === 0) {
          noSpecs++
          continue
        }

        // Also try to extract specs from listing titles for more data
        const listings = await prisma.listing.findMany({
          where: { productId: product.id, status: 'ACTIVE' },
          select: { rawTitle: true },
          take: 5,
        })

        // Merge specs from all listing titles
        for (const listing of listings) {
          const listingSpecs = extractSpecs(listing.rawTitle)
          for (const [key, value] of Object.entries(listingSpecs)) {
            if (!specs[key]) {
              specs[key] = value
            }
          }
        }

        await prisma.product.update({
          where: { id: product.id },
          data: { specsJson: specs as any },
        })

        enriched++
      } catch (err) {
        errors++
        logger.error('specs-enrich.error', {
          productId: product.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    ctx.log(`Specs enrichment complete: ${enriched} enriched, ${noSpecs} no specs found, ${errors} errors`)

    return {
      itemsTotal: products.length,
      itemsDone: enriched,
      metadata: { enriched, noSpecs, errors, processed: products.length },
    }
  })
}

// Export individual extractors for reuse
export {
  extractSpecs,
  extractRAM,
  extractScreenSize,
  extractBattery,
  extractCamera,
  extractProcessor,
  extractWeight,
  extractConnectivity,
  extractResolution,
}
