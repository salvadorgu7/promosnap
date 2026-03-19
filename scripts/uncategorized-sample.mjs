import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const items = await prisma.product.findMany({
  where: { status: 'ACTIVE', categoryId: null },
  select: { name: true },
  orderBy: { popularityScore: 'desc' },
  take: 40,
})
items.forEach(p => console.log(p.name.slice(0, 80)))
console.log(`\n... ${await prisma.product.count({ where: { status: 'ACTIVE', categoryId: null } })} total`)
await prisma.$disconnect()
