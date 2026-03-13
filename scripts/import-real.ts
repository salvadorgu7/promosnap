/**
 * Import REAL products from Mercado Livre into PromoSnap.
 *
 * Run: npx tsx scripts/import-real.ts
 *
 * What it does:
 * 1. Checks ML API access (token type + endpoint availability)
 * 2. Fetches products via ML Search API (requires user token)
 * 3. Imports into PromoSnap DB via unified import pipeline
 *
 * If search fails (403), guides you through ML OAuth setup.
 *
 * Requires: MERCADOLIVRE_APP_ID + MERCADOLIVRE_SECRET in .env
 * For full access: ML_REDIRECT_URI + OAuth user token (see guide below)
 */

import { getMLToken, mlTokenStore } from '@/lib/ml-auth'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import type { MLProduct } from '@/lib/ml-discovery/types'

const ML_API = 'https://api.mercadolibre.com'

// Categories to search with keywords
const SEARCH_TARGETS = [
  { catId: 'MLB1055', keyword: 'celular', label: 'Celulares' },
  { catId: 'MLB1652', keyword: 'notebook', label: 'Notebooks' },
  { catId: 'MLB1676', keyword: 'fone bluetooth', label: 'Fones' },
  { catId: 'MLB1002', keyword: 'smart tv', label: 'TVs' },
  { catId: 'MLB186456', keyword: 'playstation', label: 'Consoles' },
  { catId: 'MLB352679', keyword: 'smartwatch', label: 'Smartwatches' },
  { catId: 'MLB1670', keyword: 'monitor gamer', label: 'Monitores' },
  { catId: 'MLB1659', keyword: 'tablet', label: 'Tablets' },
]

async function testMLAccess(token: string): Promise<{
  search: boolean
  items: boolean
  trends: boolean
  tokenType: 'user' | 'app'
}> {
  let tokenType: 'user' | 'app' = 'app'

  // Check if we have a user token
  const userToken = await mlTokenStore.get()
  if (userToken?.user_id) {
    tokenType = 'user'
  }

  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

  // Test search
  let search = false
  try {
    const res = await fetch(`${ML_API}/sites/MLB/search?q=celular&limit=1`, { headers })
    search = res.ok
  } catch { /* */ }

  // Test items
  let items = false
  try {
    const res = await fetch(`${ML_API}/items/MLB3467817498`, { headers })
    items = res.ok || res.status === 404 // 404 = endpoint works, item doesn't exist
  } catch { /* */ }

  // Test trends
  let trends = false
  try {
    const res = await fetch(`${ML_API}/trends/MLB`, { headers })
    trends = res.ok
  } catch { /* */ }

  return { search, items, trends, tokenType }
}

async function searchCategory(token: string, catId: string, keyword: string, limit = 10): Promise<MLProduct[]> {
  const url = new URL(`${ML_API}/sites/MLB/search`)
  url.searchParams.set('category', catId)
  url.searchParams.set('q', keyword)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('sort', 'relevance')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Search ${catId} failed: ${res.status}`)
  }

  const data = await res.json()
  return (data.results || []).map((item: any): MLProduct => {
    const thumbnail = item.thumbnail || ''
    return {
      externalId: item.id || '',
      catalogProductId: item.catalog_product_id ?? undefined,
      title: item.title || '',
      currentPrice: item.price || 0,
      originalPrice: item.original_price ?? undefined,
      currency: item.currency_id || 'BRL',
      productUrl: item.permalink || '',
      imageUrl: thumbnail.replace(/-I\.jpg$/, '-O.jpg') || undefined,
      isFreeShipping: item.shipping?.free_shipping ?? false,
      availability: (item.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
      availableQuantity: item.available_quantity,
      soldQuantity: item.sold_quantity,
      condition: item.condition,
      categoryId: item.category_id,
      officialStoreName: item.official_store_name ?? undefined,
    }
  })
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  PromoSnap — Import Real Products from Mercado Livre    ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()

  // Check credentials
  const hasML = !!(
    (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
    (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
  )

  if (!hasML) {
    console.error('❌ ML credentials not found.')
    console.error('   Set MERCADOLIVRE_APP_ID + MERCADOLIVRE_SECRET in .env')
    process.exit(1)
  }

  console.log('✓ ML credentials found')

  // Get token
  let token: string
  try {
    token = await getMLToken()
    console.log('✓ ML token obtained')
  } catch (err) {
    console.error('❌ Failed to get ML token:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  // Test API access
  console.log()
  console.log('── Diagnostics ─────────────────────────────────────────')
  const access = await testMLAccess(token)
  console.log(`  Token type: ${access.tokenType}`)
  console.log(`  /trends:    ${access.trends ? '✓' : '✗'}`)
  console.log(`  /search:    ${access.search ? '✓' : '✗'}`)
  console.log(`  /items:     ${access.items ? '✓' : '✗'}`)

  if (!access.search) {
    console.log()
    console.log('╔══════════════════════════════════════════════════════════╗')
    console.log('║  ❌ Search API blocked (403)                            ║')
    console.log('║                                                         ║')
    console.log('║  O token de app (client_credentials) nao tem acesso     ║')
    console.log('║  ao /search e /items. Voce precisa de um USER TOKEN.    ║')
    console.log('║                                                         ║')
    console.log('║  COMO RESOLVER:                                         ║')
    console.log('║                                                         ║')
    console.log('║  1. Configure ML_REDIRECT_URI no .env:                  ║')
    console.log('║     ML_REDIRECT_URI=http://localhost:3000/api/admin/ml/callback')
    console.log('║                                                         ║')
    console.log('║  2. No ML Dev Center, adicione o redirect URI:          ║')
    console.log('║     https://developers.mercadolivre.com.br/devcenter    ║')
    console.log('║     → Abra seu app → Redirect URIs → adicione:         ║')
    console.log('║     http://localhost:3000/api/admin/ml/callback         ║')
    console.log('║                                                         ║')
    console.log('║  3. Rode: npm run dev                                   ║')
    console.log('║                                                         ║')
    console.log('║  4. Abra no navegador:                                  ║')
    console.log('║     http://localhost:3000/api/admin/ml/auth             ║')
    console.log('║     (loga com sua conta ML, autoriza o app)             ║')
    console.log('║                                                         ║')
    console.log('║  5. Depois do OAuth, rode de novo:                      ║')
    console.log('║     npm run import:real                                 ║')
    console.log('╚══════════════════════════════════════════════════════════╝')
    process.exit(1)
  }

  // Search API works! Import products
  console.log()
  console.log('── Searching ML categories ─────────────────────────────')

  const start = Date.now()
  const allProducts: MLProduct[] = []
  const seen = new Set<string>()

  for (const target of SEARCH_TARGETS) {
    try {
      const products = await searchCategory(token, target.catId, target.keyword, 10)
      let added = 0
      for (const p of products) {
        if (!seen.has(p.externalId) && p.currentPrice > 0) {
          allProducts.push(p)
          seen.add(p.externalId)
          added++
        }
      }
      console.log(`  ✓ ${target.label}: ${added} products`)
    } catch (err) {
      console.log(`  ✗ ${target.label}: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log()
  console.log(`  Total discovered: ${allProducts.length} products`)

  if (allProducts.length === 0) {
    console.log('⚠ No products found. Try again in a few minutes.')
    process.exit(0)
  }

  // Show samples
  console.log()
  console.log('── Sample products ─────────────────────────────────────')
  for (const p of allProducts.slice(0, 6)) {
    const price = `R$ ${p.currentPrice.toFixed(2)}`
    const discount = p.originalPrice ? ` (era R$ ${p.originalPrice.toFixed(2)})` : ''
    const shipping = p.isFreeShipping ? ' [frete gratis]' : ''
    console.log(`  ${p.title.slice(0, 65)}`)
    console.log(`    ${price}${discount}${shipping}`)
  }

  // Import
  console.log()
  console.log('── Importing to DB ─────────────────────────────────────')

  const importItems: ImportItem[] = allProducts.map(p => ({
    externalId: p.externalId,
    title: p.title,
    currentPrice: p.currentPrice,
    originalPrice: p.originalPrice,
    productUrl: p.productUrl,
    imageUrl: p.imageUrl,
    isFreeShipping: p.isFreeShipping,
    availability: p.availability,
    soldQuantity: p.soldQuantity,
    condition: p.condition,
    sourceSlug: 'mercadolivre',
  }))

  let importResult
  try {
    importResult = await runImportPipeline(importItems)
  } catch (err) {
    console.error('❌ Import failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log()
  console.log(`  ✓ Created:  ${importResult.created}`)
  console.log(`  ↻ Updated:  ${importResult.updated}`)
  console.log(`  – Skipped:  ${importResult.skipped}`)
  console.log(`  ✗ Failed:   ${importResult.failed}`)
  console.log(`  ─────────────────`)
  console.log(`  Total:      ${importResult.total}`)
  console.log(`  Duration:   ${importResult.durationMs}ms`)

  const failures = importResult.items.filter(i => i.action === 'failed')
  if (failures.length > 0) {
    console.log()
    console.log('  Failures:')
    for (const f of failures.slice(0, 5)) {
      console.log(`    ${f.externalId}: ${f.reason}`)
    }
  }

  const totalMs = Date.now() - start
  console.log()
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log(`║  ✅ ${importResult.created} real products imported in ${(totalMs / 1000).toFixed(1)}s`)
  console.log('║')
  console.log('║  Next steps:')
  console.log('║  • npm run dev → check homepage')
  console.log('║  • /api/admin/status → verify catalog stats')
  console.log('║  • Re-run daily or let cron handle it')
  console.log('╚══════════════════════════════════════════════════════════╝')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
