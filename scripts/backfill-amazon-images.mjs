/**
 * scripts/backfill-amazon-images.mjs
 *
 * Retroactively fetches product images for Amazon products that have no imageUrl.
 * Scrapes og:image / data-old-hires from amazon.com.br product pages.
 *
 * Usage:
 *   node scripts/backfill-amazon-images.mjs
 *   node scripts/backfill-amazon-images.mjs --dry-run
 *   node scripts/backfill-amazon-images.mjs --limit 50
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : 200
const CONCURRENCY = 3
const DELAY_MS = 600

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchAmazonImage(asin) {
  const url = `https://www.amazon.com.br/dp/${asin}`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      return { url, status: res.status, image: null }
    }

    const reader = res.body?.getReader()
    if (!reader) return { url, status: res.status, image: null }

    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 80_000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      if (html.includes('</head>')) break
    }
    reader.cancel().catch(() => {})

    // 1. og:image (most reliable)
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)

    // 2. data-old-hires (Amazon full-res)
    const hiResMatch = html.match(/data-old-hires=["']([^"']+)["']/)

    // 3. landingImage src
    const landingMatch = html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/)

    const image = ogMatch?.[1] || hiResMatch?.[1] || landingMatch?.[1] || null
    const validImage = image && image.startsWith('http') && image.length > 10 ? image : null

    return { url, status: res.status, image: validImage }
  } catch (err) {
    return { url, status: 0, image: null, error: String(err) }
  }
}

async function main() {
  console.log(`\n🔍 Amazon Image Backfill`)
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  console.log(`   Limit: ${LIMIT} products\n`)

  // Find Amazon products without images — join via listings to get ASINs
  const products = await prisma.product.findMany({
    where: {
      imageUrl: null,
      status: 'ACTIVE',
      listings: {
        some: {
          source: { name: { contains: 'amazon', mode: 'insensitive' } },
          externalId: { startsWith: 'B' },
        },
      },
    },
    include: {
      listings: {
        where: {
          source: { name: { contains: 'amazon', mode: 'insensitive' } },
          externalId: { startsWith: 'B' },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    take: LIMIT,
  })

  console.log(`📦 Found ${products.length} Amazon products without images\n`)

  if (products.length === 0) {
    console.log('✅ Nothing to fix!\n')
    await prisma.$disconnect()
    return
  }

  let fixed = 0
  let failed = 0
  let blocked = 0

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY)

    const results = await Promise.all(
      batch.map(async (product) => {
        const asin = product.listings[0]?.externalId
        if (!asin || !asin.match(/^B[A-Z0-9]{9}$/)) {
          return { product, asin, image: null, status: 0, skipped: true }
        }
        const result = await fetchAmazonImage(asin)
        return { product, asin, ...result }
      })
    )

    for (const r of results) {
      const { product, asin, image, status, skipped } = r
      if (skipped) {
        console.log(`  ⏭  [${product.id}] skipped — no valid ASIN`)
        continue
      }

      if (image) {
        console.log(`  ✅ [${asin}] ${product.name?.slice(0, 50)}`)
        console.log(`        → ${image.slice(0, 80)}`)
        fixed++
        if (!DRY_RUN) {
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: image },
          })
          // Also update the listing imageUrl if null
          if (product.listings[0]) {
            await prisma.listing.updateMany({
              where: { productId: product.id, imageUrl: null },
              data: { imageUrl: image },
            })
          }
        }
      } else if (status === 503 || status === 403 || status === 429) {
        console.log(`  🚫 [${asin}] BLOCKED (HTTP ${status}) — ${product.name?.slice(0, 40)}`)
        blocked++
      } else {
        console.log(`  ❌ [${asin}] no image found (HTTP ${status}) — ${product.name?.slice(0, 40)}`)
        failed++
      }
    }

    if (i + CONCURRENCY < products.length) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n📊 Summary`)
  console.log(`   Total processed : ${products.length}`)
  console.log(`   Images found    : ${fixed}`)
  console.log(`   Blocked by Amazon: ${blocked}`)
  console.log(`   No image found  : ${failed}`)
  if (DRY_RUN) {
    console.log(`\n   ℹ️  DRY RUN — no changes written to DB`)
  } else {
    console.log(`\n   ✅ ${fixed} products updated with images`)
  }

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('Fatal error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
