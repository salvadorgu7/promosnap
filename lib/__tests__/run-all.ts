/**
 * Test runner — imports and executes all test files.
 * Run with: npx tsx lib/__tests__/run-all.ts
 */

import { printSummary, resetCounters } from "./test-utils";
import { runRateLimitTests } from "./rate-limit.test";
import { runDataTrustTests } from "./data-trust.test";
import { runUrlTests } from "./url.test";
import { runCacheTests } from "./cache.test";

async function main() {
  console.log("\n🧪 PromoSnap Test Suite\n" + "═".repeat(50));

  resetCounters();

  // Sync tests
  runRateLimitTests();
  runDataTrustTests();
  runUrlTests();

  // Async tests
  await runCacheTests();

  const allPassed = printSummary();

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error running tests:", err);
  process.exit(1);
});
