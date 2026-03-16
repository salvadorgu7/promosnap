#!/usr/bin/env node
// Scrape ML product data by IDs or URLs — run locally, paste JSON into admin
// Usage:
//   node scripts/scrape-ids.mjs MLB1234567890 MLB9876543210
//   node scripts/scrape-ids.mjs "https://produto.mercadolivre.com.br/MLB-1234567890-..."
//   node scripts/scrape-ids.mjs < ids.txt
//
// Output: JSON array ready to paste into admin "Cola JSON" mode

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function extractId(input) {
  const match = input.match(/MLB-?(\d+)/)
  return match ? `MLB${match[1]}` : input.trim()
}

async function scrapeProduct(id) {
  // Try multiple URL formats
  const numericId = id.replace('MLB', '')
  const urls = [
    `https://produto.mercadolivre.com.br/MLB-${numericId}`,
    `https://www.mercadolivre.com.br/p/${id}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
        redirect: 'follow',
      })
      if (!res.ok) continue
      const html = await res.text()

      // Try JSON-LD
      const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
      if (ldMatch) {
        try {
          const ld = JSON.parse(ldMatch[1].replace(/\\u002F/g, '/'))
          const product = ld['@type'] === 'Product' ? ld : (ld['@graph'] || []).find(x => x['@type'] === 'Product')
          if (product) {
            return {
              externalId: id,
              title: product.name,
              price: product.offers?.price || product.offers?.lowPrice || 0,
              url: res.url || url,
              imageUrl: typeof product.image === 'string' ? product.image : (Array.isArray(product.image) ? product.image[0] : ''),
              originalPrice: undefined,
            }
          }
        } catch { /* parse error, try next */ }
      }

      // Fallback: parse meta tags
      const titleMatch = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/)
      const imageMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/)
      const priceMatch = html.match(/price_amount['"]\s*(?:content|value)=['"]?([\d.,]+)/) ||
                          html.match(/"price":\s*([\d.]+)/) ||
                          html.match(/R\$\s*([\d.,]+)/)

      if (titleMatch && priceMatch) {
        return {
          externalId: id,
          title: titleMatch[1],
          price: parseFloat(priceMatch[1].replace('.', '').replace(',', '.')),
          url: res.url || url,
          imageUrl: imageMatch ? imageMatch[1] : '',
          originalPrice: undefined,
        }
      }
    } catch (e) {
      console.error(`  [${id}] ${url} → ${e.message}`)
    }
  }

  return null
}

async function main() {
  let inputs = process.argv.slice(2)

  // Read from stdin if no args
  if (inputs.length === 0) {
    const chunks = []
    process.stdin.setEncoding('utf8')
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    inputs = chunks.join('').split(/[\n,\s]+/).filter(Boolean)
  }

  if (inputs.length === 0) {
    console.error('Uso: node scripts/scrape-ids.mjs MLB123 MLB456 ...')
    console.error('  ou: echo "MLB123\\nMLB456" | node scripts/scrape-ids.mjs')
    process.exit(1)
  }

  const ids = inputs.map(extractId).filter(i => /^MLB\d+$/.test(i))
  console.error(`Scraping ${ids.length} produtos...`)

  const results = []
  for (const id of ids) {
    console.error(`  ${id}...`)
    const product = await scrapeProduct(id)
    if (product) {
      results.push(product)
      console.error(`  ✓ ${product.title.slice(0, 60)} — R$${product.price}`)
    } else {
      console.error(`  ✗ ${id} — não encontrado`)
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300))
  }

  console.error(`\n${results.length}/${ids.length} encontrados`)
  console.error('\nCopie o JSON abaixo e cole na aba "Cola JSON" do admin:\n')
  console.log(JSON.stringify(results, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
