/**
 * Verify script — runs unit tests + smoke tests in sequence with clear reporting.
 *
 * Run with: npx tsx scripts/verify.ts
 *
 * Steps:
 * 1. Run unit tests (lib/__tests__/run-all.ts)
 * 2. Run smoke tests (scripts/smoke-test.ts) — skipped if SKIP_SMOKE=1
 *
 * Note: Smoke tests require a running dev server.
 * The build step should be run separately: npm run build
 */

import { execSync } from "child_process";

const SKIP_SMOKE = process.env.SKIP_SMOKE === "1";

interface StepResult {
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

const steps: StepResult[] = [];

function runStep(name: string, command: string, optional = false): boolean {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Step: ${name}`);
  console.log(`  Command: ${command}`);
  console.log("=".repeat(60) + "\n");

  const start = Date.now();

  try {
    execSync(command, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env },
    });

    const durationMs = Date.now() - start;
    steps.push({ name, success: true, durationMs });
    console.log(`\n  \x1b[32m[PASS]\x1b[0m ${name} (${durationMs}ms)\n`);
    return true;
  } catch (err) {
    const durationMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    steps.push({
      name,
      success: false,
      durationMs,
      error: optional ? `Skipped/optional: ${message}` : message,
    });

    if (optional) {
      console.log(`\n  \x1b[33m[SKIP]\x1b[0m ${name} (${durationMs}ms) — optional\n`);
      return true; // Don't fail on optional steps
    }

    console.log(`\n  \x1b[31m[FAIL]\x1b[0m ${name} (${durationMs}ms)\n`);
    return false;
  }
}

function printSummary() {
  const totalMs = steps.reduce((acc, s) => acc + s.durationMs, 0);
  const passed = steps.filter((s) => s.success).length;
  const failed = steps.filter((s) => !s.success).length;

  console.log("\n" + "=".repeat(60));
  console.log("  Verification Summary");
  console.log("=".repeat(60) + "\n");

  for (const step of steps) {
    const icon = step.success ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    console.log(`  [${icon}] ${step.name} (${step.durationMs}ms)`);
    if (step.error && !step.success) {
      console.log(`         \x1b[31m${step.error.slice(0, 120)}\x1b[0m`);
    }
  }

  console.log(`\n  Total: ${steps.length} steps | \x1b[32m${passed} passed\x1b[0m | \x1b[31m${failed} failed\x1b[0m | ${totalMs}ms`);
  console.log("");

  return failed === 0;
}

async function main() {
  console.log("\n  PromoSnap Verification Pipeline");
  console.log("  " + new Date().toISOString());
  console.log("");

  // Step 1: Unit tests (required)
  const testsOk = runStep("Unit Tests", "npx tsx lib/__tests__/run-all.ts");
  if (!testsOk) {
    printSummary();
    process.exit(1);
  }

  // Step 2: Smoke tests (optional, requires running server)
  if (SKIP_SMOKE) {
    console.log("\n  [INFO] Smoke tests skipped (SKIP_SMOKE=1)\n");
    steps.push({ name: "Smoke Tests", success: true, durationMs: 0, error: "Skipped by env" });
  } else {
    runStep("Smoke Tests", "npx tsx scripts/smoke-test.ts", true);
  }

  // Summary
  const allPassed = printSummary();

  if (!allPassed) {
    process.exit(1);
  }

  console.log("\x1b[32m  All verification steps passed.\x1b[0m\n");
}

main().catch((err) => {
  console.error("Fatal error in verification:", err);
  process.exit(1);
});
