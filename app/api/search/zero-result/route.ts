import { NextRequest, NextResponse } from "next/server";
import { getZeroResultActions } from "@/lib/demand/zero-result-actions";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  if (!query.trim()) {
    return NextResponse.json({ actions: [] });
  }

  const actions = await getZeroResultActions(query);
  return NextResponse.json({ actions });
}
