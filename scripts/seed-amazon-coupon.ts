/**
 * Seed the Amazon promosnap-20 affiliate tracking tag into the database.
 *
 * NOTE: promosnap-20 is an AFFILIATE TRACKING TAG, not a discount coupon.
 * It generates commission for PromoSnap when users buy via Amazon.
 * Stored as Coupon record for compatibility with existing coupon UI.
 *
 * Run: npx tsx scripts/seed-amazon-coupon.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const source = await prisma.source.findUnique({ where: { slug: 'amazon-br' } })
  if (!source) {
    console.error('Source "amazon-br" not found. Run seed first.')
    process.exit(1)
  }

  const existing = await prisma.coupon.findFirst({ where: { code: 'promosnap-20' } })
  if (existing) {
    // Update description if it still says "cupom"
    await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        description: 'Tag de afiliado Amazon — compras via links com tag=promosnap-20 geram comissao para o PromoSnap. Nao e cupom de desconto.',
      },
    })
    console.log('Updated promosnap-20 description:', existing.id)
    return
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: 'promosnap-20',
      description: 'Tag de afiliado Amazon — compras via links com tag=promosnap-20 geram comissao para o PromoSnap. Nao e cupom de desconto.',
      sourceId: source.id,
      status: 'ACTIVE',
    },
  })

  console.log('Created promosnap-20:', coupon.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
