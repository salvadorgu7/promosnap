/**
 * Seed the Amazon promosnap-20 coupon into the database.
 * Run: npx tsx scripts/seed-amazon-coupon.ts
 * Or call POST /api/admin/coupons with:
 *   { "code": "promosnap-20", "description": "...", "sourceSlug": "amazon-br" }
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const source = await prisma.source.findUnique({ where: { slug: 'amazon-br' } })
  if (!source) {
    console.error('❌ Source "amazon-br" not found. Run seed first.')
    process.exit(1)
  }

  const existing = await prisma.coupon.findFirst({ where: { code: 'promosnap-20' } })
  if (existing) {
    console.log('✅ Coupon promosnap-20 already exists:', existing.id)
    return
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: 'promosnap-20',
      description: 'Use o cupom promosnap-20 na Amazon para apoiar o PromoSnap. Aplicável a produtos selecionados.',
      sourceId: source.id,
      status: 'ACTIVE',
    },
  })

  console.log('✅ Created coupon promosnap-20:', coupon.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
