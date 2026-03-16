#!/usr/bin/env node
// Scrape ML search results by keyword — run locally, paste JSON into admin
// Usage:
//   node scripts/scrape-search.mjs "iphone 15" "notebook gamer" "airfryer"
//   node scripts/scrape-search.mjs smartphone --limit 20
//
// Output: JSON array ready to paste into admin "Cola JSON" mode

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function scrapeSearch(query, limit = 10) {
  const slug = query.trim().replace(/\s+/g, '-')
  const url = `https://lista.mercadolivre.com.br/${encodeURIComponent(slug)}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.error(`  [${query}] HTTP ${res.status}`)
      return []
    }

    const html = await res.text()
    const results = []

    // Parse JSON-LD structured data
    const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
    if (ldMatch) {
      try {
        const raw = ldMatch[1].replace(/\\u002F/g, '/')
        const ld = JSON.parse(raw)
        const graph = ld['@graph'] || []
        const products = graph.filter(x => x['@type'] === 'Product').slice(0, limit)

        for (const p of products) {
          const idMatch = p.offers?.url?.match(/MLB-?(\d+)/)
          results.push({
            externalId: idMatch ? `MLB${idMatch[1]}` : `SEARCH_${Date.now()}_${results.length}`,
            title: p.name,
            price: p.offers?.price || p.offers?.lowPrice || 0,
            url: (p.offers?.url || '').replace(/\\u002F/g, '/'),
            imageUrl: (typeof p.image === 'string' ? p.image : (Array.isArray(p.image) ? p.image[0] : '')).replace(/\\u002F/g, '/'),
            originalPrice: undefined,
          })
        }
      } catch (e) {
        console.error(`  [${query}] JSON-LD parse error: ${e.message}`)
      }
    }

    // Fallback: try parsing HTML result cards if JSON-LD didn't work
    if (results.length === 0) {
      const cardPattern = /data-item-id="(MLB\d+)"[^>]*>[\s\S]*?class="[^"]*title[^"]*"[^>]*>([^<]+)/g
      let match
      while ((match = cardPattern.exec(html)) !== null && results.length < limit) {
        results.push({
          externalId: match[1],
          title: match[2].trim(),
          price: 0,
          url: `https://produto.mercadolivre.com.br/${match[1]}`,
          imageUrl: '',
        })
      }
    }

    return results
  } catch (e) {
    console.error(`  [${query}] error: ${e.message}`)
    return []
  }
}

async function main() {
  const args = process.argv.slice(2)
  let limit = 10
  const queries = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1])
      i++
    } else {
      queries.push(args[i])
    }
  }

  if (queries.length === 0) {
    console.error('Uso: node scripts/scrape-search.mjs "iphone 15" "notebook" --limit 10')
    process.exit(1)
  }

  console.error(`Buscando ${queries.length} termos (limit=${limit} por termo)...`)
  const allResults = []

  for (const q of queries) {
    console.error(`  "${q}"...`)
    const results = await scrapeSearch(q, limit)
    allResults.push(...results)
    console.error(`  ✓ ${results.length} produtos encontrados`)
    await new Promise(r => setTimeout(r, 500))
  }

  // Deduplicate by externalId
  const seen = new Set()
  const unique = allResults.filter(p => {
    if (seen.has(p.externalId)) return false
    seen.add(p.externalId)
    return true
  })

  console.error(`\n${unique.length} produtos unicos encontrados`)
  console.error('\nCopie o JSON abaixo e cole na aba "Cola JSON" do admin:\n')
  console.log(JSON.stringify(unique, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
