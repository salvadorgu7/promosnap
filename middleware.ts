import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to:
 * 1. Protect /admin routes with cookie-based auth.
 *    Unauthenticated users are redirected to /admin-login (outside /admin layout).
 *    API routes under /api/admin are protected separately via x-admin-secret header.
 * 2. Add X-Robots-Tag: noindex, nofollow to all /api/ responses so bots that
 *    somehow crawl API endpoints get an explicit signal to ignore them.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Block crawlers from API routes via X-Robots-Tag header
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // Check for admin auth cookie
  const cookie = req.cookies.get("admin-auth")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    // In production/preview: block admin without secret (fail-closed)
    const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
    if (env === 'production' || env === 'preview') {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin-login";
      return NextResponse.redirect(loginUrl);
    }
    // Dev mode: allow access without secret
    return NextResponse.next();
  }

  // Cookie value = sha256(ADMIN_SECRET), computed via Web Crypto API (Edge-compatible)
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  if (cookie === expectedHash) {
    return NextResponse.next();
  }

  // Not authenticated — redirect to login page
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin-login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
