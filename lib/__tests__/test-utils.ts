/**
 * Minimal test runner for PromoSnap.
 * No external dependencies — just Node.js assert-style helpers.
 */

let currentSuite = "";
let passCount = 0;
let failCount = 0;
const failures: { suite: string; test: string; error: string }[] = [];

export function describe(name: string, fn: () => void | Promise<void>): void {
  currentSuite = name;
  console.log(`\n  ${name}`);
  const result = fn();
  if (result instanceof Promise) {
    // Handled in run-all.ts via async wrapper
  }
}

export function it(name: string, fn: () => void): void {
  try {
    fn();
    passCount++;
    console.log(`    \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failCount++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`    \x1b[31m✗\x1b[0m ${name}`);
    console.log(`      \x1b[31m${msg}\x1b[0m`);
    failures.push({ suite: currentSuite, test: name, error: msg });
  }
}

export const expect = <T>(actual: T) => ({
  toBe(expected: T): void {
    if (actual !== expected) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  toEqual(expected: T): void {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(`Expected ${b}, got ${a}`);
    }
  },
  toBeTruthy(): void {
    if (!actual) {
      throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
    }
  },
  toBeFalsy(): void {
    if (actual) {
      throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
    }
  },
  toBeGreaterThan(expected: number): void {
    if (typeof actual !== "number" || actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
  toBeGreaterThanOrEqual(expected: number): void {
    if (typeof actual !== "number" || actual < expected) {
      throw new Error(`Expected ${actual} to be >= ${expected}`);
    }
  },
  toBeLessThan(expected: number): void {
    if (typeof actual !== "number" || actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  },
  toBeLessThanOrEqual(expected: number): void {
    if (typeof actual !== "number" || actual > expected) {
      throw new Error(`Expected ${actual} to be <= ${expected}`);
    }
  },
  toContain(expected: string): void {
    if (typeof actual !== "string" || !actual.includes(expected)) {
      throw new Error(`Expected "${actual}" to contain "${expected}"`);
    }
  },
  toStartWith(expected: string): void {
    if (typeof actual !== "string" || !actual.startsWith(expected)) {
      throw new Error(`Expected "${actual}" to start with "${expected}"`);
    }
  },
  toHaveLength(expected: number): void {
    const len = (actual as any)?.length;
    if (len !== expected) {
      throw new Error(`Expected length ${expected}, got ${len}`);
    }
  },
  toBeNull(): void {
    if (actual !== null) {
      throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
    }
  },
  toBeUndefined(): void {
    if (actual !== undefined) {
      throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
    }
  },
  toBeDefined(): void {
    if (actual === undefined) {
      throw new Error(`Expected defined value, got undefined`);
    }
  },
  toBeInstanceOf(expected: any): void {
    if (!(actual instanceof expected)) {
      throw new Error(`Expected instance of ${expected.name}`);
    }
  },
  toThrow(): void {
    if (typeof actual !== "function") {
      throw new Error("Expected a function for toThrow()");
    }
    try {
      (actual as any)();
      throw new Error("Expected function to throw, but it did not");
    } catch (err) {
      if (err instanceof Error && err.message === "Expected function to throw, but it did not") {
        throw err;
      }
      // Function threw as expected
    }
  },
});

export function getTestResults() {
  return { passCount, failCount, failures };
}

export function printSummary(): boolean {
  console.log("\n" + "─".repeat(50));
  console.log(
    `  \x1b[32m${passCount} passing\x1b[0m, \x1b[31m${failCount} failing\x1b[0m`
  );

  if (failures.length > 0) {
    console.log("\n  Failures:");
    for (const f of failures) {
      console.log(`    \x1b[31m• ${f.suite} > ${f.test}\x1b[0m`);
      console.log(`      ${f.error}`);
    }
  }

  console.log("");
  return failCount === 0;
}

export function resetCounters(): void {
  passCount = 0;
  failCount = 0;
  failures.length = 0;
}
