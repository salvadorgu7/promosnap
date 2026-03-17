#!/usr/bin/env npx tsx
/**
 * PromoSnap Smoke Test Suite
 *
 * Run after every deploy to validate critical endpoints and flows.
 * Usage: npx tsx scripts/smoke-test.ts [baseUrl]
 *
 * Exit code 0 = all pass, 1 = failures detected
 */

export {} // Module marker for top-level await

const BASE_URL = process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface TestResult {
  name: string
  pass: boolean
  status?: number
  ms: number
  error?: string
}

const results: TestResult[] = []

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now()
  try {
    await fn()
    results.push({ name, pass: true, ms: Date.now() - start })
  } catch (err: any) {
    results.push({
      name,
      pass: false,
      ms: Date.now() - start,
      error: err.message || String(err),
    })
  }
}

async function fetchJson(path: string, options?: RequestInit) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

async function fetchStatus(path: string): Promise<number> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'manual' })
  return res.status
}

// HEALTH & INFRA
await test('GET /api/health → 200', async () => {
  const { res, body } = await fetchJson('/api/health')
  if (res.status !== 200) throw new Error(`Status ${res.status}`)
  if (body.status === 'critical') throw new Error(`Health: critical`)
})

// SEARCH
await test('GET /api/search?q=iphone → 200, has results', async () => {
  const { res, body } = await fetchJson('/api/search?q=iphone')
  if (res.status !== 200) throw new Error(`Status ${res.status}`)
  if (!body.results || !Array.isArray(body.results)) throw new Error('Missing results array')
})

await test('GET /api/search?q=notebook → 200', async () => {
  const { res } = await fetchJson('/api/search?q=notebook')
  if (res.status !== 200) throw new Error(`Status ${res.status}`)
})

await test('GET /api/search (empty query) → 200 or 400', async () => {
  const { res } = await fetchJson('/api/search')
  if (res.status !== 200 && res.status !== 400) throw new Error(`Status ${res.status}`)
})

// TRENDING
await test('GET /api/trending → 200', async () => {
  const { res } = await fetchJson('/api/trending')
  if (res.status !== 200) throw new Error(`Status ${res.status}`)
})

// RECOMMENDATIONS
await test('GET /api/recommendations → 200', async () => {
  const { res } = await fetchJson('/api/recommendations')
  if (res.status !== 200) throw new Error(`Status ${res.status}`)
})

// OPPORTUNITIES
await test('GET /api/opportunities → 200', async () => {
  const { res } = await fetchJson('/api/opportunities')
  if (res.status !== 200) throw new Error(`Status ${res.status}`)
})

// PUBLIC PAGES (SSR)
await test('GET / (homepage) → 200', async () => {
  const status = await fetchStatus('/')
  if (status !== 200) throw new Error(`Status ${status}`)
})

await test('GET /busca?q=fone → 200', async () => {
  const status = await fetchStatus('/busca?q=fone')
  if (status !== 200) throw new Error(`Status ${status}`)
})

// ADMIN (should require auth)
await test('GET /api/admin/promosapp → 401 without auth', async () => {
  const { res } = await fetchJson('/api/admin/promosapp')
  if (res.status !== 401 && res.status !== 403) {
    throw new Error(`Expected 401/403, got ${res.status} — admin routes may be unprotected!`)
  }
})

// RESULTS
console.log('\n═══════════════════════════════════════════')
console.log('  PROMOSNAP SMOKE TEST RESULTS')
console.log('  Base URL: ' + BASE_URL)
console.log('═══════════════════════════════════════════\n')

let passed = 0
let failed = 0

for (const r of results) {
  const icon = r.pass ? '✅' : '❌'
  console.log(`${icon} ${r.name} (${r.ms}ms)`)
  if (!r.pass && r.error) console.log(`   └─ ${r.error}`)
  if (r.pass) passed++
  else failed++
}

console.log('\n───────────────────────────────────────────')
console.log(`  Total: ${results.length} | ✅ ${passed} passed | ❌ ${failed} failed`)
console.log('───────────────────────────────────────────\n')

if (failed > 0) {
  console.error('❌ SMOKE TEST FAILED — do not deploy without investigation')
  process.exit(1)
} else {
  console.log('✅ ALL SMOKE TESTS PASSED')
  process.exit(0)
}
