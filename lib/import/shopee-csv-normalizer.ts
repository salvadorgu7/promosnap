// ============================================================================
// Shopee CSV Normalizer
// Parses Shopee affiliate CSV exports → ImportItem[]
// CSV format: Shopee Brasil affiliate export (v2022+)
// Columns: image_link, itemid, price, global_category1, description,
//          global_category2, global_item_attributes, item_rating, sale_price,
//          global_catid2, discount_percentage, image_link_3, title,
//          global_catid1, product_link, product_short link
// ============================================================================

import type { ImportItem } from './pipeline'

// ── Category mapping (Shopee English → PromoSnap slug) ──────────────────────

/**
 * Maps Shopee's English category names (both top-level and sub-categories)
 * to PromoSnap category slugs.
 * Sub-categories take precedence (more specific).
 */
const SHOPEE_CATEGORY_MAP: Record<string, string> = {
  // ── Beauty & Personal Care ───────────────────────────────────────────────
  'beauty':                           'beleza',
  'health & personal care':           'beleza',
  'hair care':                        'beleza',
  'hair accessories':                 'beleza',
  'skin care':                        'beleza',
  'makeup':                           'beleza',
  'personal care':                    'beleza',
  'fragrances':                       'beleza',
  'oral care':                        'beleza',
  'bath & body':                      'beleza',
  'health':                           'beleza',

  // ── Fashion ─────────────────────────────────────────────────────────────
  'fashion accessories':              'moda',
  "women's apparel":                  'moda',
  "men's apparel":                    'moda',
  'bags & wallets':                   'moda',
  "women's bags":                     'moda',
  "men's bags":                       'moda',
  "kids' clothing":                   'moda',
  'accessories':                      'moda',
  'jewelry':                          'moda',
  'fashion':                          'moda',
  'clothing':                         'moda',
  'lingerie & sleep':                 'moda',
  'men fashion accessories':          'moda',
  'women fashion accessories':        'moda',

  // ── Shoes ────────────────────────────────────────────────────────────────
  'shoes':                            'tenis',
  'sneakers & athletic shoes':        'tenis',
  "men's shoes":                      'tenis',
  "women's shoes":                    'tenis',
  'sport shoes':                      'tenis',

  // ── Home & Appliances ────────────────────────────────────────────────────
  'home appliances':                  'casa',
  'home & living':                    'casa',
  'kitchen appliances':               'casa',
  'kitchen & dining':                 'casa',
  'food & beverages':                 'casa',
  'furniture':                        'casa',
  'bedding':                          'casa',
  'bath':                             'casa',
  'cleaning & laundry':               'casa',
  'storage & organization':           'casa',
  'small household appliances':       'casa',
  'home decor':                       'casa',
  'lighting & fans':                  'casa',
  'garden':                           'casa',
  'garden & outdoor living':          'casa',
  'pet care':                         'casa',

  // ── Sports ───────────────────────────────────────────────────────────────
  'sports & outdoors':                'esportes',
  'fitness & gym equipment':          'esportes',
  'outdoor recreation':               'esportes',
  'cycling':                          'esportes',
  'team sports':                      'esportes',

  // ── Electronics & IT ─────────────────────────────────────────────────────
  'electronics':                      'informatica',
  'computers & peripherals':          'informatica',
  'cameras & drones':                 'informatica',
  'printers & scanners':              'informatica',
  'electrical circuitry & parts':     'informatica',
  'computer accessories':             'informatica',
  'computer components':              'informatica',
  'monitors':                         'informatica',
  'office equipment':                 'informatica',

  // ── Laptops ──────────────────────────────────────────────────────────────
  'laptops':                          'notebooks',

  // ── Mobile & Phones ──────────────────────────────────────────────────────
  'mobile & gadgets':                 'celulares',
  'phones & telecommunications':      'celulares',
  'mobile phones':                    'celulares',
  'phone accessories':                'celulares',
  'tablets':                          'celulares',

  // ── Gaming ───────────────────────────────────────────────────────────────
  'gaming & consoles':                'gamer',
  'video games':                      'gamer',
  'gaming':                           'gamer',
  'consoles & games':                 'gamer',

  // ── Wearables ────────────────────────────────────────────────────────────
  'watches':                          'wearables',
  'smartwatches':                     'wearables',
  'wearables':                        'wearables',

  // ── Audio ────────────────────────────────────────────────────────────────
  'audio':                            'audio',
  'headphones & headsets':            'audio',
  'earphones':                        'audio',
  'speakers':                         'audio',
  'hi-fi & home audio':               'audio',

  // ── TV ───────────────────────────────────────────────────────────────────
  'tv & home entertainment':          'smart-tvs',
  'televisions':                      'smart-tvs',

  // ── Toys & Kids ──────────────────────────────────────────────────────────
  'toys, kids, & babies':             'infantil',
  'toys':                             'infantil',
  'kids & babies':                    'infantil',
  'baby products':                    'infantil',
}

/** Resolve Shopee category pair → PromoSnap slug */
function resolveCategory(cat1: string, cat2: string): string | undefined {
  const normalize = (s: string) => s.toLowerCase().trim()

  // Try sub-category first (more specific)
  if (cat2) {
    const slug = SHOPEE_CATEGORY_MAP[normalize(cat2)]
    if (slug) return slug
  }

  // Fallback to top-level category
  if (cat1) {
    const slug = SHOPEE_CATEGORY_MAP[normalize(cat1)]
    if (slug) return slug
  }

  return undefined
}

// ── RFC 4180 CSV Parser ──────────────────────────────────────────────────────

/**
 * Parse an RFC 4180-compliant CSV string.
 * Handles: quoted fields, embedded commas, embedded newlines, escaped quotes ("").
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  const len = text.length

  while (i < len) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          // Escaped double-quote ("")
          field += '"'
          i += 2
        } else {
          // End of quoted field
          inQuotes = false
          i++
        }
      } else {
        field += ch
        i++
      }
    } else {
      if (ch === '"') {
        inQuotes = true
        i++
      } else if (ch === ',') {
        row.push(field)
        field = ''
        i++
      } else if (ch === '\r') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i++
        if (i < len && text[i] === '\n') i++ // Handle \r\n
      } else if (ch === '\n') {
        row.push(field)
        field = ''
        rows.push(row)
        row = []
        i++
      } else {
        field += ch
        i++
      }
    }
  }

  // Handle final field / final row without trailing newline
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

// ── Column index resolver ────────────────────────────────────────────────────

interface ColIndex {
  imageLink: number
  itemid: number
  price: number
  globalCategory1: number
  globalCategory2: number
  itemRating: number
  salePrice: number
  discountPct: number
  title: number
  productLink: number
  productShortLink: number
}

/** Resolve column indices from the CSV header row, allowing for column reordering */
function resolveColumns(headers: string[]): ColIndex {
  const clean = (s: string) => s.toLowerCase().trim().replace(/[\s]+/g, '_')
  const idx = (name: string) => headers.findIndex(h => clean(h) === name)
  const idxContains = (substr: string) => headers.findIndex(h => h.toLowerCase().trim().includes(substr))

  return {
    imageLink:        idx('image_link')        >= 0 ? idx('image_link')        : 0,
    itemid:           idx('itemid')            >= 0 ? idx('itemid')            : 1,
    price:            idx('price')             >= 0 ? idx('price')             : 2,
    globalCategory1:  idx('global_category1')  >= 0 ? idx('global_category1')  : 3,
    globalCategory2:  idx('global_category2')  >= 0 ? idx('global_category2')  : 5,
    itemRating:       idx('item_rating')       >= 0 ? idx('item_rating')       : 7,
    salePrice:        idx('sale_price')        >= 0 ? idx('sale_price')        : 8,
    discountPct:      idx('discount_percentage') >= 0 ? idx('discount_percentage') : 10,
    title:            idx('title')             >= 0 ? idx('title')             : 12,
    productLink:      idx('product_link')      >= 0 ? idx('product_link')      : 14,
    productShortLink: idxContains('short')     >= 0 ? idxContains('short')     : 15,
  }
}

// ── Price parser ─────────────────────────────────────────────────────────────

function parsePrice(raw: string | undefined): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim()
  return parseFloat(cleaned) || 0
}

// ── Normalizer result ────────────────────────────────────────────────────────

export interface ShopeeNormalizeResult {
  items: ImportItem[]
  total: number
  skipped: number
  reasons: string[]
}

// ── Main normalizer ──────────────────────────────────────────────────────────

/**
 * Normalize a Shopee affiliate CSV string into ImportItem[].
 *
 * - Parses RFC 4180 CSV (handles multi-line descriptions)
 * - Maps Shopee English categories → PromoSnap slugs
 * - Uses `sale_price` as current price, `price` as original when discounted
 * - Idempotent: `externalId = itemid`
 *
 * @param csvText  Raw CSV string (UTF-8)
 * @param options  Optional overrides
 */
export function normalizeShopeeCSV(
  csvText: string,
  options?: { discoverySource?: string }
): ShopeeNormalizeResult {
  const rows = parseCSV(csvText)

  if (rows.length < 2) {
    return { items: [], total: 0, skipped: 0, reasons: ['CSV vazio ou sem linhas de dados'] }
  }

  const headers = rows[0]
  const col = resolveColumns(headers)

  const items: ImportItem[] = []
  let skipped = 0
  const reasons: string[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]

    // Skip completely empty rows
    if (!row || row.every(f => !f?.trim())) continue

    const itemid       = row[col.itemid]?.trim()
    const rawTitle     = row[col.title]?.trim()
    const rawPrice     = row[col.price]?.trim()
    const rawSalePrice = row[col.salePrice]?.trim()
    const imageLink    = row[col.imageLink]?.trim()
    const productLink  = row[col.productLink]?.trim()
    const cat1         = row[col.globalCategory1]?.trim() || ''
    const cat2         = row[col.globalCategory2]?.trim() || ''

    // Required fields
    if (!itemid) {
      skipped++
      reasons.push(`Row ${r}: itemid ausente`)
      continue
    }
    if (!rawTitle || rawTitle.length < 3) {
      skipped++
      reasons.push(`Row ${r} (${itemid}): título ausente ou muito curto`)
      continue
    }
    if (!productLink || !productLink.startsWith('http')) {
      skipped++
      reasons.push(`Row ${r} (${itemid}): product_link inválido`)
      continue
    }

    // Price resolution: use sale_price if available, fallback to price
    const salePrice  = parsePrice(rawSalePrice)
    const origPrice  = parsePrice(rawPrice)
    const currentPrice = salePrice > 0 ? salePrice : origPrice

    if (currentPrice <= 0) {
      skipped++
      reasons.push(`Row ${r} (${itemid}): preço inválido (${rawSalePrice ?? rawPrice})`)
      continue
    }

    // originalPrice is only set when there's an actual discount
    const originalPrice = origPrice > currentPrice ? origPrice : undefined

    const categorySlug = resolveCategory(cat1, cat2)

    items.push({
      externalId:      itemid,
      title:           rawTitle,
      currentPrice,
      originalPrice,
      productUrl:      productLink,
      imageUrl:        imageLink || undefined,
      isFreeShipping:  false,   // Shopee CSV doesn't expose free shipping flag
      availability:    'in_stock',
      categorySlug,
      sourceSlug:      'shopee',
      discoverySource: options?.discoverySource ?? 'csv_upload',
    })
  }

  return {
    items,
    total: rows.length - 1,   // Rows excluding header
    skipped,
    reasons: reasons.slice(0, 100),
  }
}
