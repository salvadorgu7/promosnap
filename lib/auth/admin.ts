import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { logger } from "@/lib/logger";

/** Common weak/placeholder secrets that MUST be rejected in production */
const BLOCKED_SECRETS = new Set([
  "changeme", "admin", "secret", "password", "123456",
  "admin123", "test", "placeholder", "your-secret-here",
]);

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
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
 * 1. x-admin-secret header (timing-safe comparison)
 * 2. admin-auth cookie (SHA256 hash of ADMIN_SECRET, verified here)
 *
 * Query param ?secret= was REMOVED for security (leaks in logs/referrer/history).
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function validateAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null; // No secret configured = open (dev mode)

  // Block weak/placeholder secrets in production
  if (process.env.NODE_ENV === "production" && (secret.length < 12 || BLOCKED_SECRETS.has(secret.toLowerCase()))) {
    logger.error("security.admin-secret.weak", { message: "ADMIN_SECRET is too weak or a placeholder. Access blocked in production." });
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Method 1: Header-based auth (timing-safe)
  const headerSecret = req.headers.get("x-admin-secret");
  if (headerSecret && safeCompare(headerSecret, secret)) {
    return null; // Authorized via header
  }

  // Method 2: Cookie-based auth — verify SHA256 hash matches
  const cookie = req.cookies.get("admin-auth")?.value;
  if (cookie) {
    const expectedHash = createHash("sha256").update(secret).digest("hex");
    if (safeCompare(cookie, expectedHash)) {
      return null; // Authorized via valid cookie
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
