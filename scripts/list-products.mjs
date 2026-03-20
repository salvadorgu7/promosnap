import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const products = await prisma.product.findMany({
  where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true } } } } },
  select: { slug: true, name: true, category: { select: { slug: true } } },
  orderBy: { popularityScore: 'desc' },
  take: 12,
})
products.forEach(p => console.log((p.category?.slug || 'no-cat').padEnd(15), p.slug))
await prisma.$disconnect()
