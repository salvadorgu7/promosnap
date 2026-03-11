import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding PromoSnap database...')

  // ---- Sources ----
  const sources = await Promise.all([
    prisma.source.upsert({
      where: { slug: 'amazon' },
      update: {},
      create: {
        name: 'Amazon Brasil',
        slug: 'amazon',
        websiteUrl: 'https://www.amazon.com.br',
        isActive: true,
        affiliateConfig: {
          tag: process.env.AMAZON_AFFILIATE_TAG || '',
          program: 'Amazon Associates',
        },
      },
    }),
    prisma.source.upsert({
      where: { slug: 'mercadolivre' },
      update: {},
      create: {
        name: 'Mercado Livre',
        slug: 'mercadolivre',
        websiteUrl: 'https://www.mercadolivre.com.br',
        isActive: true,
        affiliateConfig: {
          affiliateId: process.env.MERCADOLIVRE_AFFILIATE_ID || '',
          program: 'Mercado Livre Afiliados',
          restrictions: ['no_search_pages', 'no_category_pages', 'pdp_only'],
        },
      },
    }),
    prisma.source.upsert({
      where: { slug: 'shopee' },
      update: {},
      create: {
        name: 'Shopee',
        slug: 'shopee',
        websiteUrl: 'https://shopee.com.br',
        isActive: true,
        affiliateConfig: {
          appId: process.env.SHOPEE_APP_ID || '',
          program: 'Shopee Affiliate',
        },
      },
    }),
    prisma.source.upsert({
      where: { slug: 'shein' },
      update: {},
      create: {
        name: 'Shein',
        slug: 'shein',
        websiteUrl: 'https://br.shein.com',
        isActive: true,
        affiliateConfig: {
          affiliateId: process.env.SHEIN_AFFILIATE_ID || '',
          program: 'Shein Affiliate',
        },
      },
    }),
  ])
  console.log(`✅ ${sources.length} sources criadas`)

  // ---- Categories ----
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'eletronicos' },
      update: {},
      create: { name: 'Eletrônicos', slug: 'eletronicos', icon: '⚡', sortOrder: 1, seoTitle: 'Eletrônicos - Melhores Ofertas', seoDescription: 'Compare preços de eletrônicos em Amazon, Mercado Livre, Shopee e Shein.' },
    }),
    prisma.category.upsert({
      where: { slug: 'celulares' },
      update: {},
      create: { name: 'Celulares', slug: 'celulares', icon: '📱', sortOrder: 2, seoTitle: 'Celulares - Melhores Ofertas', seoDescription: 'Encontre o melhor preço de celulares e smartphones.' },
    }),
    prisma.category.upsert({
      where: { slug: 'casa' },
      update: {},
      create: { name: 'Casa', slug: 'casa', icon: '🏠', sortOrder: 3, seoTitle: 'Casa - Melhores Ofertas', seoDescription: 'Ofertas para sua casa: eletrodomésticos, móveis e decoração.' },
    }),
    prisma.category.upsert({
      where: { slug: 'moda' },
      update: {},
      create: { name: 'Moda', slug: 'moda', icon: '👗', sortOrder: 4, seoTitle: 'Moda - Melhores Ofertas', seoDescription: 'Roupas, calçados e acessórios com os melhores preços.' },
    }),
    prisma.category.upsert({
      where: { slug: 'beleza' },
      update: {},
      create: { name: 'Beleza', slug: 'beleza', icon: '💄', sortOrder: 5, seoTitle: 'Beleza - Melhores Ofertas', seoDescription: 'Cosméticos, perfumes e cuidados pessoais.' },
    }),
    prisma.category.upsert({
      where: { slug: 'gamer' },
      update: {},
      create: { name: 'Gamer', slug: 'gamer', icon: '🎮', sortOrder: 6, seoTitle: 'Gamer - Melhores Ofertas', seoDescription: 'Games, consoles, periféricos e acessórios gamer.' },
    }),
    prisma.category.upsert({
      where: { slug: 'infantil' },
      update: {},
      create: { name: 'Infantil', slug: 'infantil', icon: '🧸', sortOrder: 7, seoTitle: 'Infantil - Melhores Ofertas', seoDescription: 'Brinquedos, roupas infantis e artigos para bebê.' },
    }),
    prisma.category.upsert({
      where: { slug: 'esporte' },
      update: {},
      create: { name: 'Esporte', slug: 'esporte', icon: '⚽', sortOrder: 8, seoTitle: 'Esporte - Melhores Ofertas', seoDescription: 'Artigos esportivos, academia e nutrição.' },
    }),
    prisma.category.upsert({
      where: { slug: 'livros' },
      update: {},
      create: { name: 'Livros', slug: 'livros', icon: '📚', sortOrder: 9, seoTitle: 'Livros - Melhores Ofertas', seoDescription: 'Livros, e-books e materiais de estudo.' },
    }),
  ])
  console.log(`✅ ${categories.length} categorias criadas`)

  // ---- Brands ----
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { slug: 'apple' }, update: {}, create: { name: 'Apple', slug: 'apple' } }),
    prisma.brand.upsert({ where: { slug: 'samsung' }, update: {}, create: { name: 'Samsung', slug: 'samsung' } }),
    prisma.brand.upsert({ where: { slug: 'xiaomi' }, update: {}, create: { name: 'Xiaomi', slug: 'xiaomi' } }),
    prisma.brand.upsert({ where: { slug: 'jbl' }, update: {}, create: { name: 'JBL', slug: 'jbl' } }),
    prisma.brand.upsert({ where: { slug: 'nike' }, update: {}, create: { name: 'Nike', slug: 'nike' } }),
    prisma.brand.upsert({ where: { slug: 'philips' }, update: {}, create: { name: 'Philips', slug: 'philips' } }),
    prisma.brand.upsert({ where: { slug: 'amazon-echo' }, update: {}, create: { name: 'Amazon', slug: 'amazon-echo' } }),
    prisma.brand.upsert({ where: { slug: 'logitech' }, update: {}, create: { name: 'Logitech', slug: 'logitech' } }),
  ])
  console.log(`✅ ${brands.length} marcas criadas`)

  // ---- Editorial Blocks (Home) ----
  await prisma.editorialBlock.upsert({
    where: { slug: 'ofertas-quentes' },
    update: {},
    create: {
      type: 'OFFER_RAIL',
      title: 'Ofertas Quentes',
      slug: 'ofertas-quentes',
      subtitle: 'As melhores promoções agora',
      position: 1,
      isActive: true,
      payload: { minScore: 80, limit: 12 },
    },
  })

  await prisma.editorialBlock.upsert({
    where: { slug: 'menor-preco-historico' },
    update: {},
    create: {
      type: 'PRICE_DROP',
      title: 'Menor Preço Histórico',
      slug: 'menor-preco-historico',
      subtitle: 'Nunca estiveram tão baratos',
      position: 2,
      isActive: true,
      payload: { period: '90d', limit: 6 },
    },
  })

  await prisma.editorialBlock.upsert({
    where: { slug: 'mais-vendidos' },
    update: {},
    create: {
      type: 'TRENDING',
      title: 'Mais Vendidos',
      slug: 'mais-vendidos',
      subtitle: 'Os favoritos de todo mundo',
      position: 3,
      isActive: true,
      payload: { sortBy: 'sales', limit: 12 },
    },
  })

  console.log('✅ Editorial blocks criados')

  console.log('\n🎉 Seed completo!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
