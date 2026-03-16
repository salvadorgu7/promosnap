// Scrape ML product data locally for seed import
// Run: node scripts/scrape-seed.mjs

const queries = ['smartphone', 'notebook', 'fone-bluetooth', 'smartwatch', 'tablet', 'tenis-nike', 'airfryer', 'playstation-5']
const allProducts = []

for (const q of queries) {
  try {
    const res = await fetch(`https://lista.mercadolivre.com.br/${q}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    })
    const html = await res.text()
    const m = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
    if (m) {
      const j = m[1].replace(/\\u002F/g, '/')
      const ld = JSON.parse(j)
      const graph = ld['@graph'] || []
      const products = graph.filter(x => x['@type'] === 'Product').slice(0, 4)
      for (const p of products) {
        const idm = p.offers?.url?.match(/MLB\d+/)
        allProducts.push({
          externalId: idm ? idm[0] : `SEED_${Date.now()}`,
          title: p.name,
          currentPrice: p.offers?.price || 0,
          productUrl: (p.offers?.url || '').replace(/\\u002F/g, '/'),
          imageUrl: (typeof p.image === 'string' ? p.image : '').replace(/\\u002F/g, '/'),
          category: q.replace(/-/g, ' '),
        })
      }
      console.error(`[${q}] ${products.length} products`)
    }
  } catch (e) {
    console.error(`[${q}] error: ${e.message}`)
  }
}

console.log(JSON.stringify(allProducts, null, 2))
