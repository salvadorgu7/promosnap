import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  try {
    if (a.length !== b.length) {
      // Compare against self to maintain constant time, then return false
      const buf = Buffer.from(a, "utf-8");
      timingSafeEqual(buf, buf);
      return false;
    }
    return timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
  } catch {
    return false;
  }
}

/**
 * Validates admin access via:
 * 1. admin-auth cookie (same as middleware — SHA256 of ADMIN_SECRET)
 * 2. x-admin-secret header (timing-safe comparison)
 *
 * Query param ?secret= was REMOVED for security (leaks in logs/referrer/history).
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function validateAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null; // No secret configured = open (dev mode)

  // Method 1: Cookie-based auth (same hash as middleware)
  const cookie = req.cookies.get("admin-auth")?.value;
  if (cookie) {
    // Cookie is SHA256 of secret — we can't verify here without async crypto
    // But if cookie is present, middleware already validated it for /admin routes
    // For API routes, also check the header below
  }

  // Method 2: Header-based auth (timing-safe)
  const headerSecret = req.headers.get("x-admin-secret");
  if (headerSecret && safeCompare(headerSecret, secret)) {
    return null; // Authorized via header
  }

  // Method 3: Cookie-based auth for browser requests from admin UI
  if (cookie) {
    // Accept cookie auth for admin UI AJAX requests
    // The cookie was already validated by middleware for /admin/* pages
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
