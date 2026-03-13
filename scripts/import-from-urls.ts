/**
 * Import REAL products from Mercado Livre URLs.
 *
 * Run: npx tsx scripts/import-from-urls.ts
 *
 * NO API auth needed — fetches public product pages and extracts
 * structured data (JSON-LD / og: meta tags).
 *
 * Add URLs to the PRODUCT_URLS array below, or pass a file:
 *   npx tsx scripts/import-from-urls.ts urls.txt
 */

import { runImportPipeline, type ImportItem } from '@/lib/import'

// ═══════════════════════════════════════════════════════════════════════════
// ADD ML PRODUCT URLS HERE (or pass a .txt file with one URL per line)
// ═══════════════════════════════════════════════════════════════════════════

const PRODUCT_URLS: string[] = [
  // Celulares
  'https://www.mercadolivre.com.br/samsung-galaxy-s24-fe-5g-dual-sim-256-gb-grafite-8-gb-ram/p/MLB37867417',
  'https://www.mercadolivre.com.br/samsung-galaxy-a15-dual-sim-128-gb-azul-claro-4-gb-ram/p/MLB22549498',
  'https://www.mercadolivre.com.br/apple-iphone-16-128-gb-preto-distribuidor-autorizado/p/MLB1040287851',
  'https://www.mercadolivre.com.br/motorola-moto-g85-5g-dual-sim-256-gb-grafite-12-gb-ram/p/MLB37722413',
  'https://www.mercadolivre.com.br/xiaomi-redmi-note-13-dual-sim-256-gb-preto-8-gb-ram/p/MLB22424414',

  // Notebooks
  'https://www.mercadolivre.com.br/notebook-lenovo-ideapad-1-15amn7-amd-ryzen-5-7520u-156-8gb-ram-256gb-ssd/p/MLB27064871',
  'https://www.mercadolivre.com.br/notebook-samsung-galaxy-book4-np750xgk-kg2br-intel-core-i5-1335u-156-full-hd-8gb-ram-256gb-ssd/p/MLB37560805',

  // Fones
  'https://www.mercadolivre.com.br/fone-de-ouvido-in-ear-sem-fio-jbl-tune-flex-preto/p/MLB20515498',
  'https://www.mercadolivre.com.br/fone-de-ouvido-in-ear-sem-fio-samsung-galaxy-buds-fe-preto/p/MLB21940722',

  // TVs
  'https://www.mercadolivre.com.br/smart-tv-samsung-50-crystal-uhd-4k-50du7700-2024-gaming-hub/p/MLB36939741',
  'https://www.mercadolivre.com.br/smart-tv-lg-43-4k-uhd-43ur7800psa-ai-thinq/p/MLB21800580',

  // Consoles & Games
  'https://www.mercadolivre.com.br/sony-playstation-5-slim-1tb-standard-branco-e-preto/p/MLB22048498',

  // Smartwatches
  'https://www.mercadolivre.com.br/apple-watch-se-gps-2a-geracao-caixa-de-aluminio-meia-noite-de-40-mm-pulseira-esportiva-meia-noite-ms/p/MLB22072700',
  'https://www.mercadolivre.com.br/samsung-galaxy-watch-fe-bluetooth-40mm-preto/p/MLB37824547',

  // Audio
  'https://www.mercadolivre.com.br/caixa-de-som-portatil-jbl-flip-6-com-bluetooth-a-prova-dagua-preta/p/MLB19796773',

  // Tablets
  'https://www.mercadolivre.com.br/tablet-samsung-galaxy-tab-a9-64gb-wi-fi-tela-88-android-13/p/MLB22007200',
]

// ═══════════════════════════════════════════════════════════════════════════

interface ExtractedProduct {
  title: string
  price: number
  originalPrice?: number
  imageUrl?: string
  productUrl: string
  externalId: string
  isFreeShipping: boolean
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
}

async function extractFromUrl(url: string): Promise<ExtractedProduct | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      console.error(`  ✗ ${url.slice(0, 60)}... → ${res.status}`)
      return null
    }

    const html = await res.text()

    // Extract JSON-LD
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
    let jsonLd: any = null
    if (jsonLdMatch) {
      try {
        const parsed = JSON.parse(jsonLdMatch[1])
        // JSON-LD can be an array or single object
        jsonLd = Array.isArray(parsed) ? parsed.find((j: any) => j['@type'] === 'Product') : parsed
      } catch { /* */ }
    }

    // Extract og: meta tags as fallback
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/) ||
                    html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/)
    const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/) ||
                    html.match(/<meta\s+content="([^"]*)"\s+property="og:image"/)
    const ogPrice = html.match(/<meta\s+itemprop="price"\s+content="([^"]*)"/) ||
                    html.match(/property="product:price:amount"\s+content="([^"]*)"/) ||
                    html.match(/content="([^"]*)"\s+property="product:price:amount"/)

    // Extract from preload state (ML includes full product data in __PRELOADED_STATE__)
    const preloadMatch = html.match(/"price"\s*:\s*(\d+(?:\.\d+)?)/);
    const origPriceMatch = html.match(/"original_price"\s*:\s*(\d+(?:\.\d+)?)/);

    // Extract product ID from URL
    let externalId = ''
    const pMatch = url.match(/\/p\/(MLB\d+)/)
    if (pMatch) {
      externalId = pMatch[1]
    } else {
      const mlbMatch = url.match(/(MLB[- ]?\d+)/)
      externalId = mlbMatch ? mlbMatch[1].replace(/[- ]/g, '') : `url-${Date.now()}`
    }

    // Build product from best available data
    let title = ''
    let price = 0
    let originalPrice: number | undefined
    let imageUrl: string | undefined

    if (jsonLd?.['@type'] === 'Product') {
      title = jsonLd.name || ''
      const offer = jsonLd.offers || jsonLd.offers?.[0]
      if (offer) {
        price = parseFloat(offer.price || offer.lowPrice || '0')
      }
      imageUrl = jsonLd.image || (Array.isArray(jsonLd.image) ? jsonLd.image[0] : undefined)
    }

    // Fallback to og: tags
    if (!title && ogTitle) title = ogTitle[1]
    if (!price && ogPrice) price = parseFloat(ogPrice[1])
    if (!imageUrl && ogImage) imageUrl = ogImage[1]

    // Fallback to regex extraction
    if (!price && preloadMatch) price = parseFloat(preloadMatch[1])
    if (!originalPrice && origPriceMatch) {
      const op = parseFloat(origPriceMatch[1])
      if (op > price) originalPrice = op
    }

    // Try to extract title from <title> tag
    if (!title) {
      const titleMatch = html.match(/<title>([^<]*)<\/title>/)
      if (titleMatch) {
        title = titleMatch[1]
          .replace(/\s*\|\s*MercadoLivre.*$/i, '')
          .replace(/\s*-\s*Mercado Livre.*$/i, '')
          .trim()
      }
    }

    // Check free shipping
    const isFreeShipping = html.includes('free_shipping') ||
      html.includes('frete grátis') ||
      html.includes('Frete grátis') ||
      html.includes('"free_shipping":true')

    if (!title || price <= 0) {
      console.error(`  ✗ Could not extract data from ${url.slice(0, 60)}...`)
      return null
    }

    return {
      title,
      price,
      originalPrice,
      imageUrl,
      productUrl: url,
      externalId,
      isFreeShipping,
      availability: 'in_stock',
    }
  } catch (err) {
    console.error(`  ✗ Fetch failed: ${url.slice(0, 50)}... → ${err instanceof Error ? err.message : err}`)
    return null
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  PromoSnap — Import from ML Product URLs               ║')
  console.log('║  (No API auth needed — uses public page data)          ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()

  // Check for file argument
  let urls = [...PRODUCT_URLS]
  const fileArg = process.argv[2]
  if (fileArg) {
    const fs = await import('fs')
    const content = fs.readFileSync(fileArg, 'utf-8')
    const fileUrls = content.split('\n').map(l => l.trim()).filter(l => l && l.startsWith('http'))
    urls = [...urls, ...fileUrls]
    console.log(`  Loaded ${fileUrls.length} URLs from ${fileArg}`)
  }

  // Dedupe
  urls = [...new Set(urls)]
  console.log(`  Total URLs to process: ${urls.length}`)
  console.log()

  // Extract product data
  console.log('── Extracting product data from ML pages ────────────────')

  const products: ExtractedProduct[] = []
  const BATCH_SIZE = 3 // Parallel fetches per batch (be polite)

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE)
    const results = await Promise.allSettled(batch.map(extractFromUrl))

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        products.push(result.value)
        const p = result.value
        console.log(`  ✓ ${p.title.slice(0, 55)}  R$ ${p.price.toFixed(2)}`)
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < urls.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log()
  console.log(`  Extracted: ${products.length}/${urls.length} products`)

  if (products.length === 0) {
    console.log('❌ No products could be extracted.')
    process.exit(1)
  }

  // Import
  console.log()
  console.log('── Importing to DB ─────────────────────────────────────')

  const importItems: ImportItem[] = products.map(p => ({
    externalId: p.externalId,
    title: p.title,
    currentPrice: p.price,
    originalPrice: p.originalPrice,
    productUrl: p.productUrl,
    imageUrl: p.imageUrl,
    isFreeShipping: p.isFreeShipping,
    availability: p.availability,
    sourceSlug: 'mercadolivre',
  }))

  const importResult = await runImportPipeline(importItems)

  console.log()
  console.log(`  ✓ Created:  ${importResult.created}`)
  console.log(`  ↻ Updated:  ${importResult.updated}`)
  console.log(`  – Skipped:  ${importResult.skipped}`)
  console.log(`  ✗ Failed:   ${importResult.failed}`)
  console.log(`  Duration:   ${importResult.durationMs}ms`)

  console.log()
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log(`║  ✅ ${importResult.created} real products imported!`)
  console.log('║')
  console.log('║  Para adicionar mais produtos:')
  console.log('║  1. Adicione URLs ao array PRODUCT_URLS no script')
  console.log('║  2. Ou crie um arquivo .txt com URLs e rode:')
  console.log('║     npx tsx scripts/import-from-urls.ts urls.txt')
  console.log('╚══════════════════════════════════════════════════════════╝')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
