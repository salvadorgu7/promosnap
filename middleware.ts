import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect /admin routes with cookie-based auth.
 * Unauthenticated users are redirected to /admin-login (outside /admin layout).
 * API routes under /api/admin are protected separately via x-admin-secret header.
 */
export async function middleware(req: NextRequest) {
  // Check for admin auth cookie
  const cookie = req.cookies.get("admin-auth")?.value;
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    // No secret configured — dev mode, allow access
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
  const { pathname } = req.nextUrl;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin-login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
