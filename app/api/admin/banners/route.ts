import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
  const bannerType = searchParams.get("bannerType");
  const isActive = searchParams.get("isActive");

  const where: any = {};
  if (bannerType) where.bannerType = bannerType;
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  const [banners, total] = await Promise.all([
    prisma.banner.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.banner.count({ where }),
  ]);

  return NextResponse.json({
    banners,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      title, subtitle, imageUrl, ctaText, ctaUrl,
      bannerType, priority, isActive, startAt, endAt, autoMode,
    } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        subtitle: subtitle || null,
        imageUrl: imageUrl || null,
        ctaText: ctaText || null,
        ctaUrl: ctaUrl || null,
        bannerType: bannerType || "HERO",
        priority: priority ?? 0,
        isActive: isActive ?? true,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        autoMode: autoMode || null,
      },
    });

    return NextResponse.json({ banner }, { status: 201 });
  } catch (error) {
    logger.error("banners.create-failed", { error });
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}
