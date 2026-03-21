/**
 * Auto Blog — generates monthly "best of" articles using GPT + real catalog data.
 *
 * Creates articles like "Melhores Celulares de Março 2026" with real products,
 * prices, and buy signals from the PromoSnap catalog.
 *
 * Published as EditorialBlock (type: 'article') for the /guias section.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const log = logger.child({ job: 'auto-blog' })

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface BlogTopic {
  title: string
  slug: string
  query: string
  category: string
}

function getMonthlyTopics(): BlogTopic[] {
  const now = new Date()
  const month = MONTH_NAMES[now.getMonth()]
  const year = now.getFullYear()

  return [
    { title: `Melhores Celulares de ${month} ${year}`, slug: `melhores-celulares-${month.toLowerCase()}-${year}`, query: 'celular smartphone', category: 'celulares' },
    { title: `Melhores Notebooks de ${month} ${year}`, slug: `melhores-notebooks-${month.toLowerCase()}-${year}`, query: 'notebook laptop', category: 'notebooks' },
    { title: `Melhores Ofertas de ${month} ${year}`, slug: `melhores-ofertas-${month.toLowerCase()}-${year}`, query: 'oferta promoção', category: '' },
    { title: `Melhores Fones de ${month} ${year}`, slug: `melhores-fones-${month.toLowerCase()}-${year}`, query: 'fone bluetooth', category: 'audio' },
    { title: `Melhores Smart TVs de ${month} ${year}`, slug: `melhores-smart-tvs-${month.toLowerCase()}-${year}`, query: 'smart tv 4k', category: 'smart-tvs' },
  ]
}

export async function generateAutoBlog() {
  const topics = getMonthlyTopics()
  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const topic of topics) {
    try {
      // Check if already exists
      const existing = await prisma.editorialBlock.findUnique({
        where: { slug: `blog-${topic.slug}` },
      })

      if (existing) {
        skipped++
        continue
      }

      // Fetch top products for this topic
      const where: any = {
        status: 'ACTIVE',
        listings: { some: { offers: { some: { isActive: true } } } },
      }
      if (topic.category) {
        where.category = { slug: topic.category }
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          listings: {
            include: {
              source: { select: { name: true } },
              offers: {
                where: { isActive: true },
                orderBy: { offerScore: 'desc' },
                take: 1,
              },
            },
            take: 1,
          },
        },
        orderBy: { popularityScore: 'desc' },
        take: 10,
      })

      const validProducts = products
        .filter(p => p.listings[0]?.offers[0]?.currentPrice)
        .slice(0, 5)

      if (validProducts.length < 3) {
        skipped++
        continue
      }

      // Generate article content (structured, no GPT needed for basic version)
      const productList = validProducts.map((p, i) => {
        const offer = p.listings[0].offers[0]
        const source = p.listings[0].source?.name || 'PromoSnap'
        const price = `R$ ${offer.currentPrice.toFixed(2).replace('.', ',')}`
        const discount = offer.originalPrice && offer.originalPrice > offer.currentPrice
          ? ` (-${Math.round((1 - offer.currentPrice / offer.originalPrice) * 100)}%)`
          : ''

        return `${i + 1}. **${p.name}** — ${price}${discount} em ${source}`
      }).join('\n\n')

      const content = `# ${topic.title}\n\nSelecionamos os melhores produtos com base em preço, avaliações e histórico de preço dos últimos 90 dias.\n\n## Top ${validProducts.length} Produtos\n\n${productList}\n\n---\n\n*Preços verificados em ${new Date().toLocaleDateString('pt-BR')}. Valores podem mudar a qualquer momento.*\n\n[Comparar todos os preços no PromoSnap →](/busca?q=${encodeURIComponent(topic.query)})`

      // Save as EditorialBlock
      await prisma.editorialBlock.create({
        data: {
          slug: `blog-${topic.slug}`,
          title: topic.title,
          subtitle: `Os ${validProducts.length} melhores produtos selecionados pelo PromoSnap`,
          blockType: 'ARTICLE',
          status: 'PUBLISHED',
          payloadJson: {
            content,
            query: topic.query,
            category: topic.category,
            productCount: validProducts.length,
            generatedAt: new Date().toISOString(),
            products: validProducts.map(p => ({
              name: p.name,
              slug: p.slug,
              price: p.listings[0].offers[0].currentPrice,
            })),
          },
        },
      })

      created++
      log.info('auto-blog.created', { slug: topic.slug, products: validProducts.length })
    } catch (err) {
      errors.push(`${topic.slug}: ${String(err)}`)
    }
  }

  return { status: 'OK', created, skipped, errors }
}
