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

  // NOTE: www ↔ non-www redirect is handled by Vercel domain settings.
  // Do NOT add middleware redirects here — they conflict with Vercel's
  // edge-level redirects and cause ERR_TOO_MANY_REDIRECTS loops.

  // Block crawlers from API routes via X-Robots-Tag header
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // ── Admin auth: only for /admin routes (not /admin-login) ──
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin-login")) {
    const cookie = req.cookies.get("admin-auth")?.value;
    const secret = process.env.ADMIN_SECRET;

    if (!secret) {
      const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
      if (env === 'production' || env === 'preview') {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/admin-login";
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (cookie === expectedHash) {
      return NextResponse.next();
    }

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin-login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // All other routes pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    // www redirect + admin auth + API noindex
    // Excludes static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap|og-image|logo|manifest).*)",
  ],
};
