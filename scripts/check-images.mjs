import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const total = await prisma.product.count({ where: { status: 'ACTIVE' } })
  const noImage = await prisma.product.count({ where: { status: 'ACTIVE', imageUrl: null } })
  const emptyImage = await prisma.product.count({ where: { status: 'ACTIVE', imageUrl: '' } })
  const withImage = total - noImage - emptyImage
  console.log('Active products:', total)
  console.log('  With image:', withImage)
  console.log('  Null image:', noImage)
  console.log('  Empty image:', emptyImage)

  const totalListings = await prisma.listing.count({ where: { status: 'ACTIVE' } })
  const listingsWithImage = await prisma.listing.count({ where: { status: 'ACTIVE', imageUrl: { not: null } } })
  const listingsEmptyImage = await prisma.listing.count({ where: { status: 'ACTIVE', imageUrl: '' } })
  console.log('\nActive listings:', totalListings)
  console.log('  With image:', listingsWithImage)
  console.log('  Null image:', totalListings - listingsWithImage)
  console.log('  Empty string image:', listingsEmptyImage)

  // Sample products without image
  const sample = await prisma.product.findMany({
    where: { status: 'ACTIVE', imageUrl: null },
    select: {
      name: true,
      originType: true,
      listings: {
        select: { imageUrl: true, source: { select: { slug: true } } },
        take: 2
      }
    },
    take: 8,
  })
  console.log('\nSample products WITHOUT image:')
  for (const p of sample) {
    const src = p.listings[0]?.source?.slug || '?'
    const img = p.listings[0]?.imageUrl || 'NULL'
    console.log(`  [${src}] ${p.name.slice(0,55)} | origin: ${p.originType} | listing img: ${img.slice(0,50)}`)
  }

  // Sample products WITH image
  const withImg = await prisma.product.findMany({
    where: { status: 'ACTIVE', imageUrl: { not: null } },
    select: { name: true, imageUrl: true, originType: true },
    take: 5,
  })
  console.log('\nSample products WITH image:')
  for (const p of withImg) {
    console.log(`  ${p.name.slice(0,55)} | origin: ${p.originType} | img: ${p.imageUrl?.slice(0,60)}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
