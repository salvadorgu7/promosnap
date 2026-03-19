import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// 1. Products without category
const noCategory = await prisma.product.count({ where: { status: 'ACTIVE', categoryId: null } })
const total = await prisma.product.count({ where: { status: 'ACTIVE' } })
console.log(`\n=== CATEGORIAS ===`)
console.log(`Total active: ${total}`)
console.log(`Sem categoria: ${noCategory} (${Math.round(noCategory/total*100)}%)`)

// Top categories
const cats = await prisma.category.findMany({
  include: { _count: { select: { products: true } } },
  orderBy: { products: { _count: 'desc' } },
})
console.log(`\nCategorias com produtos:`)
cats.filter(c => c._count.products > 0).forEach(c => console.log(`  ${c.slug.padEnd(20)} ${c._count.products} produtos`))

// 2. Listings with ratings
const withRating = await prisma.listing.count({ where: { status: 'ACTIVE', rating: { not: null } } })
const totalListings = await prisma.listing.count({ where: { status: 'ACTIVE' } })
console.log(`\n=== RATINGS ===`)
console.log(`Listings activos: ${totalListings}`)
console.log(`Com rating: ${withRating} (${Math.round(withRating/totalListings*100)}%)`)

// 3. Products with price history
const snaps = await prisma.priceSnapshot.groupBy({
  by: ['offerId'],
  _count: true,
  having: { offerId: { _count: { gte: 3 } } },
})
console.log(`\n=== HISTORICO ===`)
console.log(`Ofertas com 3+ snapshots: ${snaps.length}`)

// 4. Offers with specs
const withSpecs = await prisma.product.count({ where: { status: 'ACTIVE', specsJson: { not: null } } })
console.log(`\n=== SPECS ===`)
console.log(`Com specsJson: ${withSpecs} (${Math.round(withSpecs/total*100)}%)`)

// 5. Mismatched categories (sample)
console.log(`\n=== SAMPLE: produtos potencialmente mal categorizados ===`)
const sample = await prisma.product.findMany({
  where: { status: 'ACTIVE', categoryId: { not: null } },
  include: { category: { select: { slug: true } } },
  take: 200,
  orderBy: { popularityScore: 'desc' },
})
const suspects = sample.filter(p => {
  const name = p.name.toLowerCase()
  const cat = p.category?.slug || ''
  // Check obvious mismatches
  if (cat === 'impressoras' && !name.includes('impress') && !name.includes('toner') && !name.includes('cartucho') && !name.includes('print')) return true
  if (cat === 'celulares' && !name.includes('celular') && !name.includes('phone') && !name.includes('smartphone') && !name.includes('galaxy') && !name.includes('iphone') && !name.includes('motorola') && !name.includes('xiaomi') && !name.includes('samsung')) return true
  return false
})
suspects.slice(0, 10).forEach(p => console.log(`  [${p.category?.slug}] ${p.name.slice(0, 60)}`))
console.log(`  ... ${suspects.length} total suspeitos em 200 amostrados`)

await prisma.$disconnect()
