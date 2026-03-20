import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import prisma from '@/lib/db/prisma'
import { generateArticle, type ArticleInput } from '@/lib/ai/article-generator'

export async function POST(req: NextRequest) {
  // Admin auth
  const secret = req.headers.get('x-admin-secret')
  const expected = process.env.ADMIN_SECRET
  if (expected && (!secret || createHash('sha256').update(secret).digest('hex') !== createHash('sha256').update(expected).digest('hex'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type = 'guide', topic, categorySlug, brandSlug } = body as {
      type?: ArticleInput['type']
      topic?: string
      categorySlug?: string
      brandSlug?: string
    }

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 })
    }

    // Check if article already exists
    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const existing = await prisma.article.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({
        error: 'Article already exists',
        article: { id: existing.id, slug: existing.slug, status: existing.status },
      }, { status: 409 })
    }

    const article = await generateArticle({ type, topic, categorySlug, brandSlug })

    const saved = await prisma.article.create({
      data: {
        slug: article.slug,
        title: article.title,
        content: article.content,
        category: article.category,
        tags: article.tags,
        status: 'DRAFT',
        author: 'PromoSnap AI',
      },
    })

    return NextResponse.json({
      ok: true,
      article: {
        id: saved.id,
        slug: saved.slug,
        title: saved.title,
        status: saved.status,
        contentLength: article.content.length,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
