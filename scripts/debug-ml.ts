/**
 * Debug ML API — shows exactly what highlights returns and why hydrate fails
 * Run: npx tsx scripts/debug-ml.ts
 */

import { getMLToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

async function main() {
  const token = await getMLToken()
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' }

  console.log('=== 1. RAW HIGHLIGHTS RESPONSE (MLB1055 = Celulares) ===')
  const hlRes = await fetch(`${ML_API}/highlights/MLB/category/MLB1055`, { headers })
  console.log(`Status: ${hlRes.status}`)
  const hlData = await hlRes.json()
  console.log('Keys:', Object.keys(hlData))
  const entries = hlData.content || hlData.results || []
  console.log(`Entries count: ${entries.length}`)
  console.log('First 5 entries (raw):')
  for (const e of entries.slice(0, 5)) {
    console.log(JSON.stringify(e))
  }

  if (entries.length === 0) {
    console.log('No entries — trying alternate keys...')
    console.log('Full response (first 500 chars):', JSON.stringify(hlData).slice(0, 500))
    return
  }

  // Try hydrating first ID
  const firstId = entries[0].id || entries[0].item_id || entries[0].product_id
  console.log(`\n=== 2. HYDRATE FIRST ID: "${firstId}" ===`)

  // Try /items/{id}
  console.log(`\n  GET /items/${firstId}`)
  const itemRes = await fetch(`${ML_API}/items/${firstId}`, { headers })
  console.log(`  Status: ${itemRes.status}`)
  if (itemRes.ok) {
    const d = await itemRes.json()
    console.log(`  Title: ${d.title}`)
    console.log(`  Price: ${d.price}`)
  } else {
    const err = await itemRes.text()
    console.log(`  Error: ${err.slice(0, 200)}`)
  }

  // Try /products/{id}
  console.log(`\n  GET /products/${firstId}`)
  const prodRes = await fetch(`${ML_API}/products/${firstId}`, { headers })
  console.log(`  Status: ${prodRes.status}`)
  if (prodRes.ok) {
    const d = await prodRes.json()
    console.log(`  Name: ${d.name}`)
    console.log(`  Has buy_box_winner: ${!!d.buy_box_winner}`)
  } else {
    const err = await prodRes.text()
    console.log(`  Error: ${err.slice(0, 200)}`)
  }

  // Try multi-get /items?ids=
  const ids = entries.slice(0, 5).map((e: any) => e.id || e.item_id || e.product_id).filter(Boolean)
  console.log(`\n=== 3. MULTI-GET /items?ids=${ids.join(',')} ===`)
  const multiRes = await fetch(`${ML_API}/items?ids=${ids.join(',')}&attributes=id,title,price,permalink,thumbnail,shipping,pictures,available_quantity,sold_quantity,condition,category_id,official_store_name,original_price,currency_id,catalog_product_id`, { headers })
  console.log(`Status: ${multiRes.status}`)
  if (multiRes.ok) {
    const multiData = await multiRes.json()
    console.log(`Results: ${multiData.length}`)
    for (const r of multiData.slice(0, 3)) {
      console.log(`  ${r.code}: ${r.body?.title || r.body?.name || 'N/A'} — R$${r.body?.price || '?'}`)
    }
  } else {
    const err = await multiRes.text()
    console.log(`Error: ${err.slice(0, 300)}`)
  }

  // Try a known test item
  console.log('\n=== 4. TEST KNOWN ITEM (MLB3467817498) ===')
  const testRes = await fetch(`${ML_API}/items/MLB3467817498`, { headers })
  console.log(`Status: ${testRes.status}`)
  if (!testRes.ok) {
    const err = await testRes.text()
    console.log(`Error: ${err.slice(0, 200)}`)
  }

  // Try without auth
  console.log('\n=== 5. SAME WITHOUT AUTH ===')
  const noAuthRes = await fetch(`${ML_API}/items/${firstId}`)
  console.log(`/items/${firstId} without auth: ${noAuthRes.status}`)
  const noAuthRes2 = await fetch(`${ML_API}/items/MLB3467817498`)
  console.log(`/items/MLB3467817498 without auth: ${noAuthRes2.status}`)

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
