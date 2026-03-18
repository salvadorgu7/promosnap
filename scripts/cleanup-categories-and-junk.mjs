/**
 * One-time script: Clean up duplicate/empty categories and junk Shopee products
 *
 * 1. Delete "Smart TVs & Audio" (tv-audio) — duplicate of separate Smart Tvs + Audio categories
 * 2. Deactivate junk Shopee spam products (names like "Gente Olha Issoo", "Caiu Demaisss")
 *
 * Usage: node scripts/cleanup-categories-and-junk.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ─── 1. Delete duplicate "Smart TVs & Audio" category ───
  const dupCategory = await prisma.category.findUnique({ where: { slug: 'tv-audio' } })
  if (dupCategory) {
    // Check if any products reference this category
    const productsInDup = await prisma.product.count({ where: { categoryId: dupCategory.id } })
    if (productsInDup === 0) {
      await prisma.category.delete({ where: { id: dupCategory.id } })
      console.log(`✓ Deleted duplicate category "Smart TVs & Audio" (tv-audio) — had 0 products`)
    } else {
      console.log(`⚠ Category "Smart TVs & Audio" has ${productsInDup} products — skipping delete`)
    }
  } else {
    console.log('Category "tv-audio" not found — already deleted?')
  }

  // ─── 2. Deactivate junk Shopee spam products ───
  // These are WhatsApp group messages with exclamatory names and no real product data
  const junkPatterns = [
    'Gente Olha',
    'Caiu Demais',
    'Perde Nao',
    'Perde Não',
    'Corre Que',
    'Aproveita Que',
    'Olha Isso',
    'Meninas Olh',
    'Gente Corre',
    'Gente Socorro',
    'Tá Barato',
    'Ta Barato',
    'Muitooo',
    'Demaisss',
    'Issoo',
    'Nãoooo',
  ]

  // Find junk products by name patterns
  const junkProducts = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: junkPatterns.map(p => ({ name: { contains: p, mode: 'insensitive' } })),
    },
    select: { id: true, name: true, slug: true, imageUrl: true },
  })

  console.log(`\nFound ${junkProducts.length} junk/spam products to deactivate:`)
  for (const p of junkProducts) {
    console.log(`  ${p.name.slice(0, 70)} | img: ${p.imageUrl ? 'yes' : 'no'}`)
  }

  if (junkProducts.length > 0) {
    const ids = junkProducts.map(p => p.id)
    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: 'INACTIVE', hidden: true },
    })
    console.log(`\n✓ Deactivated ${result.count} junk products`)
  }

  // Summary
  const activeProducts = await prisma.product.count({ where: { status: 'ACTIVE' } })
  const activeCategories = await prisma.category.count()
  console.log(`\nFinal state: ${activeProducts} active products, ${activeCategories} categories`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
