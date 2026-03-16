import { NextRequest, NextResponse } from "next/server";
import { getZeroResultActions } from "@/lib/demand/zero-result-actions";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  const query = request.nextUrl.searchParams.get("q") || "";
  if (!query.trim()) {
    return NextResponse.json({ actions: [] });
  }

  const actions = await getZeroResultActions(query);
  return NextResponse.json({ actions });
}
