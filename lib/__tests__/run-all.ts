/**
 * Test runner — imports and executes all test files.
 * Run with: npx tsx lib/__tests__/run-all.ts
 */

import { printSummary, resetCounters } from "./test-utils";
import { runRateLimitTests } from "./rate-limit.test";
import { runDataTrustTests } from "./data-trust.test";
import { runUrlTests } from "./url.test";
import { runCacheTests } from "./cache.test";
import { runSecurityRateLimitTests } from "./security-rate-limit.test";
import { runProductionChecksTests } from "./production-checks.test";
import { runMonitoringTests } from "./monitoring.test";
import { runImagesTests } from "./images.test";
import { runCatalogValidationTests } from "./catalog-validation.test";

async function main() {
  console.log("\n🧪 PromoSnap Test Suite\n" + "═".repeat(50));

  resetCounters();

  // Sync tests
  runRateLimitTests();
  runDataTrustTests();
  runUrlTests();
  runSecurityRateLimitTests();
  runProductionChecksTests();
  runImagesTests();
  runCatalogValidationTests();

  // Async tests
  await runCacheTests();
  await runMonitoringTests();

  const allPassed = printSummary();

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error running tests:", err);
  process.exit(1);
});
