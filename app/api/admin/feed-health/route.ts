import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { safeCompare } from '@/lib/auth/admin'

/**
 * GET /api/admin/feed-health — Feed health metrics for Google Merchant
 */
export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

  const headerSecret = req.headers.get('x-admin-secret')
  const cookieSecret = req.cookies.get('admin_token')?.value
  const token = headerSecret || cookieSecret || ''
  if (!safeCompare(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [totalProducts, activeProducts, withImage, withCategory, withOffer, withAffiliate, priceRange] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { status: 'ACTIVE', imageUrl: { not: null } } }),
      prisma.product.count({ where: { status: 'ACTIVE', categoryId: { not: null } } }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          listings: { some: { offers: { some: { isActive: true } } } },
        },
      }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          listings: { some: { offers: { some: { isActive: true, affiliateUrl: { not: null } } } } },
        },
      }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          imageUrl: { not: null },
          listings: {
            some: {
              offers: {
                some: {
                  isActive: true,
                  currentPrice: { gte: 5, lte: 50000 },
                  affiliateUrl: { not: null },
                },
              },
            },
          },
        },
      }),
    ])

    // Top categories among eligible products
    const topCategories = await prisma.category.findMany({
      where: {
        products: {
          some: {
            status: 'ACTIVE',
            imageUrl: { not: null },
            listings: { some: { offers: { some: { isActive: true, affiliateUrl: { not: null } } } } },
          },
        },
      },
      select: {
        name: true,
        _count: {
          select: {
            products: {
              where: {
                status: 'ACTIVE',
                imageUrl: { not: null },
              },
            },
          },
        },
      },
      orderBy: { products: { _count: 'desc' } },
      take: 10,
    })

    // Top brands among eligible products
    const topBrands = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            status: 'ACTIVE',
            imageUrl: { not: null },
            listings: { some: { offers: { some: { isActive: true, affiliateUrl: { not: null } } } } },
          },
        },
      },
      select: {
        name: true,
        _count: {
          select: {
            products: {
              where: {
                status: 'ACTIVE',
                imageUrl: { not: null },
              },
            },
          },
        },
      },
      orderBy: { products: { _count: 'desc' } },
      take: 10,
    })

    const inactive = totalProducts - activeProducts

    return NextResponse.json({
      totalProducts: activeProducts,
      eligibleProducts: priceRange,
      reasons: {
        noImage: activeProducts - withImage,
        noActiveOffer: activeProducts - withOffer,
        noAffiliate: withOffer - withAffiliate,
        priceOutOfRange: withAffiliate - priceRange,
        inactive,
      },
      topCategories: topCategories.map(c => ({ name: c.name, count: c._count.products })),
      topBrands: topBrands.map(b => ({ name: b.name, count: b._count.products })),
      sampleProducts: [],
      feedUrl: '/api/feed/google-merchant',
      lastChecked: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch feed health' }, { status: 500 })
  }
}
