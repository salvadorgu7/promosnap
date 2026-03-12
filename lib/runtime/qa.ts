import fs from "fs";
import path from "path";
import prisma from "@/lib/db/prisma";

export interface RuntimeCheck {
  name: string;
  category: "routes" | "api" | "security" | "data";
  status: "pass" | "warn" | "fail";
  message: string;
  details?: string;
}

export interface RuntimeReport {
  timestamp: string;
  overall: "pass" | "warn" | "fail";
  summary: { pass: number; warn: number; fail: number; total: number };
  checks: RuntimeCheck[];
}

const APP_ROOT = path.resolve(process.cwd());

function fileExists(relativePath: string): boolean {
  try {
    return fs.existsSync(path.join(APP_ROOT, relativePath));
  } catch {
    return false;
  }
}

function checkFileRoute(
  name: string,
  category: RuntimeCheck["category"],
  filePath: string,
  description: string
): RuntimeCheck {
  const exists = fileExists(filePath);
  return {
    name,
    category,
    status: exists ? "pass" : "fail",
    message: exists ? `${description} found` : `${description} MISSING at ${filePath}`,
    details: filePath,
  };
}

async function checkRoutes(): Promise<RuntimeCheck[]> {
  return [
    checkFileRoute(
      "Home Page",
      "routes",
      "app/(site)/page.tsx",
      "Home page route"
    ),
    checkFileRoute(
      "Search Page",
      "routes",
      "app/(site)/busca/page.tsx",
      "Search page route"
    ),
    checkFileRoute(
      "Product Page",
      "routes",
      "app/(site)/produto/[slug]/page.tsx",
      "Product page route"
    ),
    checkFileRoute(
      "Clickout Route",
      "api",
      "app/api/clickout/[offerId]/route.ts",
      "Clickout API route"
    ),
    checkFileRoute(
      "Sitemap",
      "routes",
      "app/sitemap.ts",
      "Sitemap generator"
    ),
    checkFileRoute(
      "Robots",
      "routes",
      "app/robots.ts",
      "Robots.txt generator"
    ),
  ];
}

function checkMetadata(): RuntimeCheck {
  try {
    const layoutPath = path.join(APP_ROOT, "app/layout.tsx");
    if (!fs.existsSync(layoutPath)) {
      return {
        name: "Root Metadata",
        category: "routes",
        status: "fail",
        message: "Root layout.tsx not found",
      };
    }
    const content = fs.readFileSync(layoutPath, "utf-8");
    const hasMetadataBase = content.includes("metadataBase");
    return {
      name: "Root Metadata",
      category: "routes",
      status: hasMetadataBase ? "pass" : "warn",
      message: hasMetadataBase
        ? "Root layout has metadataBase configured"
        : "Root layout missing metadataBase — OG images may not resolve correctly",
    };
  } catch (err) {
    return {
      name: "Root Metadata",
      category: "routes",
      status: "warn",
      message: `Could not read layout: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

function checkSecurity(): RuntimeCheck[] {
  const checks: RuntimeCheck[] = [];

  // ADMIN_SECRET env
  const hasAdminSecret = !!process.env.ADMIN_SECRET;
  checks.push({
    name: "Admin Secret",
    category: "security",
    status: hasAdminSecret ? "pass" : "warn",
    message: hasAdminSecret
      ? "ADMIN_SECRET environment variable is set"
      : "ADMIN_SECRET not set — admin routes are unprotected (dev mode)",
  });

  return checks;
}

function checkApiRoutes(): RuntimeCheck[] {
  return [
    checkFileRoute(
      "Jobs Run Endpoint",
      "api",
      "app/api/admin/jobs/run/route.ts",
      "Job runner endpoint"
    ),
    checkFileRoute(
      "Alerts Endpoint",
      "api",
      "app/api/alerts/route.ts",
      "Price alerts endpoint"
    ),
    checkFileRoute(
      "Newsletter Endpoint",
      "api",
      "app/api/newsletter/route.ts",
      "Newsletter endpoint"
    ),
    checkFileRoute(
      "Recommendations Endpoint",
      "api",
      "app/api/recommendations/route.ts",
      "Recommendations endpoint"
    ),
    checkFileRoute(
      "Health Endpoint",
      "api",
      "app/api/health/route.ts",
      "Public health endpoint"
    ),
    checkFileRoute(
      "Search Endpoint",
      "api",
      "app/api/search/route.ts",
      "Search API endpoint"
    ),
  ];
}

async function checkDataIntegrity(): Promise<RuntimeCheck[]> {
  const checks: RuntimeCheck[] = [];

  try {
    const productCount = await prisma.product.count();
    checks.push({
      name: "Products in DB",
      category: "data",
      status: productCount > 0 ? "pass" : "warn",
      message:
        productCount > 0
          ? `${productCount} products in database`
          : "No products found in database",
      details: `count: ${productCount}`,
    });
  } catch (err) {
    checks.push({
      name: "Products in DB",
      category: "data",
      status: "fail",
      message: `Database query failed: ${err instanceof Error ? err.message : "unknown"}`,
    });
  }

  try {
    const activeOffers = await prisma.offer.count({
      where: { isActive: true },
    });
    checks.push({
      name: "Active Offers",
      category: "data",
      status: activeOffers > 0 ? "pass" : "warn",
      message:
        activeOffers > 0
          ? `${activeOffers} active offers`
          : "No active offers found",
      details: `count: ${activeOffers}`,
    });
  } catch (err) {
    checks.push({
      name: "Active Offers",
      category: "data",
      status: "fail",
      message: `Database query failed: ${err instanceof Error ? err.message : "unknown"}`,
    });
  }

  try {
    const sourceCount = await prisma.source.count({
      where: { status: "ACTIVE" },
    });
    checks.push({
      name: "Active Sources",
      category: "data",
      status: sourceCount > 0 ? "pass" : "warn",
      message:
        sourceCount > 0
          ? `${sourceCount} active sources`
          : "No active sources configured",
      details: `count: ${sourceCount}`,
    });
  } catch (err) {
    checks.push({
      name: "Active Sources",
      category: "data",
      status: "fail",
      message: `Database query failed: ${err instanceof Error ? err.message : "unknown"}`,
    });
  }

  return checks;
}

export async function runRuntimeQA(): Promise<RuntimeReport> {
  const checks: RuntimeCheck[] = [];

  try {
    const routeChecks = await checkRoutes();
    checks.push(...routeChecks);
  } catch {
    checks.push({
      name: "Route Checks",
      category: "routes",
      status: "fail",
      message: "Route check execution failed",
    });
  }

  checks.push(checkMetadata());
  checks.push(...checkSecurity());
  checks.push(...checkApiRoutes());

  try {
    const dataChecks = await checkDataIntegrity();
    checks.push(...dataChecks);
  } catch {
    checks.push({
      name: "Data Integrity",
      category: "data",
      status: "fail",
      message: "Data integrity check execution failed",
    });
  }

  const summary = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
    total: checks.length,
  };

  const overall: RuntimeReport["overall"] =
    summary.fail > 0 ? "fail" : summary.warn > 0 ? "warn" : "pass";

  return {
    timestamp: new Date().toISOString(),
    overall,
    summary,
    checks,
  };
}
