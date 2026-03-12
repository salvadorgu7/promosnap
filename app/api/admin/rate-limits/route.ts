import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { getRateLimitStats } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const stats = getRateLimitStats();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error("[admin/rate-limits] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate-limit stats" },
      { status: 500 }
    );
  }
}
