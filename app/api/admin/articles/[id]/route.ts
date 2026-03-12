import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateAdmin } from "@/lib/auth/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = validateAdmin(_req);
  if (denied) return denied;

  const { id } = await params;

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  return NextResponse.json({ article });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deniedPut = validateAdmin(req);
  if (deniedPut) return deniedPut;

  const { id } = await params;

  try {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, slug, subtitle, content, category, tags, status, publishedAt } = body;

    // If slug is changing, check uniqueness
    if (slug && slug !== existing.slug) {
      const slugTaken = await prisma.article.findUnique({ where: { slug } });
      if (slugTaken) {
        return NextResponse.json(
          { error: "An article with this slug already exists" },
          { status: 409 }
        );
      }
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(subtitle !== undefined && { subtitle: subtitle || null }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category: category || null }),
        ...(tags !== undefined && { tags }),
        ...(status !== undefined && { status }),
        ...(publishedAt !== undefined && {
          publishedAt: publishedAt ? new Date(publishedAt) : null,
        }),
      },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error updating article:", error);
    return NextResponse.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const deniedDel = validateAdmin(_req);
  if (deniedDel) return deniedDel;

  const { id } = await params;

  try {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Archive instead of deleting
    const article = await prisma.article.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ article, message: "Article archived" });
  } catch (error) {
    console.error("Error archiving article:", error);
    return NextResponse.json(
      { error: "Failed to archive article" },
      { status: 500 }
    );
  }
}
