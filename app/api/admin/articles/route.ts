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
  const status = searchParams.get("status");

  const where = status ? { status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" } : {};

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({
    articles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const deniedPost = validateAdmin(req);
  if (deniedPost) return deniedPost;

  try {
    const body = await req.json();
    const { title, slug, subtitle, content, category, tags, status, publishedAt } = body;

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "title, slug, and content are required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "An article with this slug already exists" },
        { status: 409 }
      );
    }

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        subtitle: subtitle || null,
        content,
        category: category || null,
        tags: tags || [],
        status: status || "DRAFT",
        publishedAt: publishedAt ? new Date(publishedAt) : null,
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    logger.error("articles.create-failed", { error });
    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
