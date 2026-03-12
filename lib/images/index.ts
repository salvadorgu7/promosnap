// Image utility helpers — CDN, fallbacks, validation

import type { ImageOptions, ImageType } from './types'

// ---------------------------------------------------------------------------
// CDN / Optimized URL
// ---------------------------------------------------------------------------

/**
 * Returns an optimized image URL.
 * If IMAGE_CDN_URL is configured (e.g. Cloudflare Images, Imgix, Cloudinary),
 * the URL is rewritten through the CDN with the given options.
 * Otherwise, the original URL is returned as-is.
 */
export function getImageUrl(url: string | null | undefined, options?: ImageOptions): string {
  if (!url) return getFallbackImage('product')

  const cdnBase = process.env.IMAGE_CDN_URL
  if (!cdnBase) return url

  // Build CDN transformation path
  // Supports generic query-param based CDN (Cloudflare Images, Imgix, etc.)
  try {
    const cdnUrl = new URL('/cdn-cgi/image/', cdnBase)

    const params: string[] = []
    if (options?.width) params.push(`w=${options.width}`)
    if (options?.height) params.push(`h=${options.height}`)
    if (options?.quality) params.push(`q=${options.quality}`)
    if (options?.format && options.format !== 'auto') params.push(`f=${options.format}`)
    if (options?.fit) params.push(`fit=${options.fit}`)

    // Default quality if not specified
    if (!options?.quality) params.push('q=80')
    // Default format
    if (!options?.format) params.push('f=auto')

    cdnUrl.pathname = `/cdn-cgi/image/${params.join(',')}/${encodeURIComponent(url)}`
    return cdnUrl.toString()
  } catch {
    // If URL construction fails, return original
    return url
  }
}

// ---------------------------------------------------------------------------
// Fallback SVG placeholders
// ---------------------------------------------------------------------------

const FALLBACK_SVGS: Record<ImageType, string> = {
  product: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f1f5f9' width='400' height='400'/%3E%3Cg transform='translate(160,150)'%3E%3Cpath d='M40 0L80 30V70L40 100L0 70V30Z' fill='none' stroke='%23cbd5e1' stroke-width='2'/%3E%3Ctext x='40' y='60' text-anchor='middle' fill='%2394a3b8' font-family='system-ui' font-size='11'%3ESem imagem%3C/text%3E%3C/g%3E%3C/svg%3E`,

  brand: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f1f5f9' width='200' height='200' rx='16'/%3E%3Ctext x='100' y='105' text-anchor='middle' fill='%2394a3b8' font-family='system-ui' font-size='12'%3EMarca%3C/text%3E%3C/svg%3E`,

  category: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f1f5f9' width='200' height='200' rx='16'/%3E%3Crect x='60' y='50' width='80' height='20' rx='4' fill='%23e2e8f0'/%3E%3Crect x='50' y='80' width='100' height='20' rx='4' fill='%23e2e8f0'/%3E%3Crect x='70' y='110' width='60' height='20' rx='4' fill='%23e2e8f0'/%3E%3Ctext x='100' y='160' text-anchor='middle' fill='%2394a3b8' font-family='system-ui' font-size='11'%3ECategoria%3C/text%3E%3C/svg%3E`,

  article: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400' viewBox='0 0 800 400'%3E%3Crect fill='%23f1f5f9' width='800' height='400'/%3E%3Crect x='200' y='120' width='400' height='16' rx='4' fill='%23e2e8f0'/%3E%3Crect x='250' y='150' width='300' height='16' rx='4' fill='%23e2e8f0'/%3E%3Crect x='280' y='180' width='240' height='16' rx='4' fill='%23e2e8f0'/%3E%3Ctext x='400' y='240' text-anchor='middle' fill='%2394a3b8' font-family='system-ui' font-size='14'%3EArtigo%3C/text%3E%3C/svg%3E`,
}

/**
 * Returns a data:image SVG placeholder for the given entity type.
 */
export function getFallbackImage(type: ImageType): string {
  return FALLBACK_SVGS[type] ?? FALLBACK_SVGS.product
}

// ---------------------------------------------------------------------------
// URL Validation
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = ['http:', 'https:']
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.msi', '.cmd']

/**
 * Validates whether a string is a plausible image URL.
 * Returns true for valid http/https URLs that look like images.
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false

  // Data URIs are valid (used for placeholders)
  if (url.startsWith('data:image/')) return true

  try {
    const parsed = new URL(url)

    // Must be http or https
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false

    // Block executable extensions
    const pathLower = parsed.pathname.toLowerCase()
    if (BLOCKED_EXTENSIONS.some((ext) => pathLower.endsWith(ext))) return false

    // Must have a hostname
    if (!parsed.hostname || parsed.hostname.length < 3) return false

    return true
  } catch {
    return false
  }
}
