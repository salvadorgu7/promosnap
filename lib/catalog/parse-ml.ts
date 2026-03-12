// Mercado Livre URL and ID parsing utilities

/**
 * Extract ML item ID from various formats:
 * - "MLB1234567890"
 * - "https://www.mercadolivre.com.br/...MLB-1234567890-..."
 * - "https://produto.mercadolivre.com.br/MLB-1234567890"
 * - "MLB-1234567890"
 * - Shortened URLs
 */
export function extractMLId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()

  // Direct ID: MLB1234567890 or MLB-1234567890
  const directMatch = trimmed.match(/^(MLB[\-]?\d{8,14})$/i)
  if (directMatch) return normalizeMLId(directMatch[1])

  // From URL path or query
  const urlMatch = trimmed.match(/MLB[\-]?\d{8,14}/i)
  if (urlMatch) return normalizeMLId(urlMatch[0])

  return null
}

/**
 * Normalize ML ID to format "MLBxxxxxxxxxx" (no dash)
 */
function normalizeMLId(id: string): string {
  return id.replace(/-/g, '').toUpperCase()
}

/**
 * Build a clean ML product URL from an ID
 */
export function buildMLUrl(id: string): string {
  const normalized = normalizeMLId(id)
  return `https://www.mercadolivre.com.br/p/${normalized}`
}

/**
 * Build affiliate URL for Mercado Livre
 */
export function buildMLAffiliateUrl(productUrl: string, mattTool = 'fococomerciobh'): string {
  try {
    const url = new URL(productUrl)
    url.searchParams.set('matt_tool', mattTool)
    return url.toString()
  } catch {
    // If not a valid URL, try to build one
    const id = extractMLId(productUrl)
    if (id) {
      return `https://www.mercadolivre.com.br/p/${id}?matt_tool=${mattTool}`
    }
    return productUrl
  }
}

/**
 * Validate that a string is a plausible ML item ID
 */
export function isValidMLId(input: string): boolean {
  return /^MLB[\-]?\d{8,14}$/i.test(input.trim())
}

/**
 * Parse multiple ML IDs from a text blob (comma, newline, space separated)
 */
export function parseMLIds(text: string): string[] {
  const matches = text.match(/MLB[\-]?\d{8,14}/gi) || []
  return [...new Set(matches.map(normalizeMLId))]
}
