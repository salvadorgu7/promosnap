import { NextRequest, NextResponse } from "next/server";
import { generateNotificationsForProducts } from "@/lib/notifications/generator";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const ids =
    req.nextUrl.searchParams
      .get("ids")
      ?.split(",")
      .filter(Boolean) || [];

  if (ids.length === 0) return NextResponse.json([]);

  try {
    const notifications = await generateNotificationsForProducts(ids);
    return NextResponse.json(notifications);
  } catch (err) {
    logger.error("notifications.generate-failed", { error: err })
    return NextResponse.json([]);
  }
}
