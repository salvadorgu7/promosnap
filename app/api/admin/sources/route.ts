import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateAdmin } from "@/lib/auth/admin";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const sources = await prisma.source.findMany({
      include: {
        _count: { select: { listings: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      sources: sources.map((s) => ({
        slug: s.slug,
        name: s.name,
        status: s.status,
        listings: s._count.listings,
      })),
    });
  } catch {
    // Fallback if DB not seeded yet
    return NextResponse.json({
      sources: [
        { slug: "amazon-br", name: "Amazon Brasil", status: "ACTIVE", listings: 0 },
        { slug: "mercadolivre", name: "Mercado Livre", status: "ACTIVE", listings: 0 },
        { slug: "shopee", name: "Shopee", status: "ACTIVE", listings: 0 },
        { slug: "shein", name: "Shein", status: "ACTIVE", listings: 0 },
      ],
    });
  }
}
