import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { safeCompare } from "@/lib/auth/admin";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: prevent brute-force login attempts
  const rl = rateLimit(req, "admin");
  if (!rl.success) {
    return rateLimitResponse(rl);
  }

  try {
    const { password } = await req.json();
    const secret = process.env.ADMIN_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "ADMIN_SECRET not configured" },
        { status: 500 }
      );
    }

    if (!password || !safeCompare(password, secret)) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    // Set auth cookie = sha256(secret) — valid for 7 days
    const hash = createHash("sha256").update(secret).digest("hex");
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin-auth", hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin-auth");
  return res;
}
