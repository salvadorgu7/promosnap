import { NextRequest, NextResponse } from "next/server";

/**
 * Validates admin access via x-admin-secret header or ?secret= query param.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function validateAdmin(req: NextRequest): NextResponse | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null; // No secret configured = open (dev mode)

  const headerSecret = req.headers.get("x-admin-secret");
  const querySecret = new URL(req.url).searchParams.get("secret");

  if (headerSecret === secret || querySecret === secret) {
    return null; // Authorized
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
