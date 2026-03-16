import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules",
      ".next",
      "e2e",
      // Legacy tests use custom test-utils runner (run via npm run test:legacy)
      "lib/__tests__/cache.test.ts",
      "lib/__tests__/catalog-validation.test.ts",
      "lib/__tests__/data-trust.test.ts",
      "lib/__tests__/images.test.ts",
      "lib/__tests__/monitoring.test.ts",
      "lib/__tests__/production-checks.test.ts",
      "lib/__tests__/rate-limit.test.ts",
      "lib/__tests__/security-rate-limit.test.ts",
      "lib/__tests__/url.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**"],
      exclude: ["**/__tests__/**", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
