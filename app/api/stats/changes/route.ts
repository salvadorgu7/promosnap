import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [priceDropsToday, newOffersToday, alertsTriggeredRecently] = await Promise.all([
      // Price drops today: price snapshots captured today where price decreased
      prisma.priceSnapshot.count({
        where: {
          capturedAt: { gte: today },
        },
      }).catch(() => 0),

      // New offers added today
      prisma.offer.count({
        where: {
          isActive: true,
          createdAt: { gte: today },
        },
      }).catch(() => 0),

      // Alerts triggered in last 7 days
      prisma.priceAlert.count({
        where: {
          isActive: false,
          triggeredAt: { gte: weekAgo },
        },
      }).catch(() => 0),
    ]);

    return NextResponse.json({
      priceDropsToday,
      newOffersToday,
      alertsTriggeredRecently,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      priceDropsToday: 0,
      newOffersToday: 0,
      alertsTriggeredRecently: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
