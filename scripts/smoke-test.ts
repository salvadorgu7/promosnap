/**
 * Smoke test — checks key pages and API routes are responding.
 *
 * Run with: npx tsx scripts/smoke-test.ts
 *
 * By default tests against http://localhost:3000
 * Override with: SMOKE_URL=https://promosnap.com.br npx tsx scripts/smoke-test.ts
 */

const BASE_URL = process.env.SMOKE_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

async function checkUrl(name: string, path: string, expectedStatus = 200): Promise<void> {
  const url = `${BASE_URL}${path}`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "PromoSnap-SmokeTest/1.0",
      },
    });

    clearTimeout(timeout);

    const durationMs = Date.now() - start;
    const ok = response.status === expectedStatus;

    results.push({
      name,
      url,
      status: response.status,
      ok,
      durationMs,
      error: ok ? undefined : `Expected ${expectedStatus}, got ${response.status}`,
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    results.push({
      name,
      url,
      status: null,
      ok: false,
      durationMs,
      error: message,
    });
  }
}

async function main() {
  console.log(`\n🔍 PromoSnap Smoke Test`);
  console.log(`   Target: ${BASE_URL}`);
  console.log("═".repeat(60) + "\n");

  // Key pages
  await checkUrl("Home Page", "/");
  await checkUrl("Ofertas Page", "/ofertas");
  await checkUrl("Busca Page", "/busca?q=test");
  await checkUrl("Categorias Page", "/categorias");
  await checkUrl("Marcas Page", "/marcas");

  // API routes
  await checkUrl("API Health", "/api/health");
  await checkUrl("API Search", "/api/search?q=test");

  // Print results
  console.log("Results:\n");

  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    const icon = result.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    const statusText = result.status !== null ? `${result.status}` : "ERR";
    const duration = `${result.durationMs}ms`;

    console.log(`  ${icon} ${result.name}`);
    console.log(`    ${result.url} → ${statusText} (${duration})`);

    if (result.error) {
      console.log(`    \x1b[31m${result.error}\x1b[0m`);
    }

    if (result.ok) passCount++;
    else failCount++;
  }

  console.log("\n" + "─".repeat(60));
  console.log(
    `  \x1b[32m${passCount} passing\x1b[0m, \x1b[31m${failCount} failing\x1b[0m`
  );
  console.log("");

  if (failCount > 0) {
    console.log(
      "\x1b[33mNote: Some tests may fail if the dev server is not running.\x1b[0m"
    );
    console.log(
      `Start with: npm run dev, then: SMOKE_URL=${BASE_URL} npx tsx scripts/smoke-test.ts\n`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error running smoke tests:", err);
  process.exit(1);
});
