// Image Audit — checks products/brands/categories for missing or broken images

import prisma from '@/lib/db/prisma'
import { isValidImageUrl } from './index'
import type { ImageAuditEntry, ImageAuditResult, ImageType } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)

    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!res.ok) return false

    const contentType = res.headers.get('content-type') || ''
    return contentType.startsWith('image/')
  } catch {
    return false
  }
}

function buildEntry(
  id: string,
  type: ImageType,
  name: string,
  slug: string,
  imageUrl: string | null,
  status: 'ok' | 'missing' | 'broken',
  error?: string,
): ImageAuditEntry {
  return { id, type, name, slug, imageUrl, status, error }
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------

/**
 * Audits all products, brands, and categories for missing or broken images.
 * Performs HEAD requests to validate broken URLs (limited to avoid rate-limits).
 *
 * @param checkBroken - Whether to perform HEAD requests for URL validation (default: false, fast mode)
 * @param limit - Max entities per type to audit (default: 500)
 */
export async function auditImages(
  checkBroken = false,
  limit = 500,
): Promise<ImageAuditResult> {
  const report: ImageAuditEntry[] = []

  // --- Products ---
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, slug: true, imageUrl: true },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    })

    for (const p of products) {
      if (!p.imageUrl || !isValidImageUrl(p.imageUrl)) {
        report.push(buildEntry(p.id, 'product', p.name, p.slug, p.imageUrl, 'missing', 'No valid image URL'))
      } else if (checkBroken) {
        const alive = await checkUrl(p.imageUrl)
        report.push(
          buildEntry(p.id, 'product', p.name, p.slug, p.imageUrl, alive ? 'ok' : 'broken', alive ? undefined : 'HEAD request failed'),
        )
      } else {
        report.push(buildEntry(p.id, 'product', p.name, p.slug, p.imageUrl, 'ok'))
      }
    }
  } catch {
    // DB table may not exist yet — skip
  }

  // --- Brands ---
  try {
    const brands = await prisma.brand.findMany({
      select: { id: true, name: true, slug: true, logoUrl: true },
      take: limit,
      orderBy: { name: 'asc' },
    })

    for (const b of brands) {
      const url = (b as any).logoUrl as string | null
      if (!url || !isValidImageUrl(url)) {
        report.push(buildEntry(b.id, 'brand', b.name, b.slug, url, 'missing', 'No valid logo URL'))
      } else if (checkBroken) {
        const alive = await checkUrl(url)
        report.push(buildEntry(b.id, 'brand', b.name, b.slug, url, alive ? 'ok' : 'broken', alive ? undefined : 'HEAD request failed'))
      } else {
        report.push(buildEntry(b.id, 'brand', b.name, b.slug, url, 'ok'))
      }
    }
  } catch {
    // skip
  }

  // --- Categories ---
  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, icon: true },
      take: limit,
      orderBy: { name: 'asc' },
    })

    for (const c of categories) {
      const url = c.icon as string | null
      if (!url || !isValidImageUrl(url)) {
        report.push(buildEntry(c.id, 'category', c.name, c.slug, url, 'missing', 'No valid image URL'))
      } else if (checkBroken) {
        const alive = await checkUrl(url)
        report.push(buildEntry(c.id, 'category', c.name, c.slug, url, alive ? 'ok' : 'broken', alive ? undefined : 'HEAD request failed'))
      } else {
        report.push(buildEntry(c.id, 'category', c.name, c.slug, url, 'ok'))
      }
    }
  } catch {
    // skip
  }

  const missing = report.filter((r) => r.status === 'missing').length
  const broken = report.filter((r) => r.status === 'broken').length

  return {
    total: report.length,
    missing,
    broken,
    report,
  }
}
