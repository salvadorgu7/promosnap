import { Metadata } from "next"
import { notFound } from "next/navigation"
import prisma from "@/lib/db/prisma"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"
import { Search, Tag, ArrowRight } from "lucide-react"
import OfferCard from "@/components/cards/OfferCard"
import type { ProductCard } from "@/types"
import { getRelatedLinks } from "@/lib/seo/internal-links"

export const revalidate = 3600

interface PagePayload {
  query: string
  slug: string
  searchVolume: number
  productCount: number
  isTrending: boolean
  seo: {
    title: string
    metaDescription: string
    h1: string
    faqs?: Array<{ question: string; answer: string }>
    internalLinks?: Array<{ label: string; href: string }>
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

async function getPageData(slug: string) {
  const block = await prisma.editorialBlock.findUnique({
    where: { slug: `descobrir-${slug}` },
  })

  if (!block || block.status !== 'PUBLISHED') return null

  const payload = block.payloadJson as unknown as PagePayload

  // Fetch matching products
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      name: { contains: payload.query, mode: 'insensitive' },
    },
    include: {
      brand: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
      listings: {
        where: { status: 'ACTIVE' },
        include: {
          source: { select: { name: true, slug: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            take: 1,
          },
        },
        take: 1,
      },
    },
    orderBy: { popularityScore: 'desc' },
    take: 24,
  })

  return { block, payload, products }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getPageData(slug)
  if (!data) return { title: 'Nao encontrado' }

  return {
    title: data.payload.seo.title,
    description: data.payload.seo.metaDescription,
  }
}

export default async function DescobrirPage({ params }: Props) {
  const { slug } = await params
  const data = await getPageData(slug)

  if (!data) notFound()

  const { payload, products } = data

  // Get related links
  const firstProduct = products[0]
  const relatedLinks = getRelatedLinks({
    categorySlug: firstProduct?.category?.slug,
    brandSlug: firstProduct?.brand?.slug,
    productName: payload.query,
    limit: 6,
  })

  // Transform products to ProductCard format
  const cards: ProductCard[] = products
    .map(p => {
      const listing = p.listings[0]
      const offer = listing?.offers[0]
      if (!offer) return null

      const discount = offer.originalPrice && offer.originalPrice > offer.currentPrice
        ? Math.round(((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100)
        : 0

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl ?? undefined,
        brand: p.brand?.name,
        category: p.category?.name,
        bestOffer: {
          offerId: offer.id,
          price: offer.currentPrice,
          originalPrice: offer.originalPrice ?? undefined,
          discount,
          sourceSlug: listing.source.slug,
          sourceName: listing.source.name,
          affiliateUrl: offer.affiliateUrl ?? '',
          isFreeShipping: offer.isFreeShipping,
          offerScore: offer.offerScore,
        },
        offersCount: 1,
        storesCount: 1,
        popularityScore: p.popularityScore,
        badges: [],
      } satisfies ProductCard
    })
    .filter(Boolean) as ProductCard[]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
          <Link href="/" className="hover:text-brand-500">Home</Link>
          <span>/</span>
          <span>Descobrir</span>
          <span>/</span>
          <span className="text-text-primary">{payload.query}</span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {payload.seo.h1}
          </h1>
          {payload.isTrending && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-orange/10 text-accent-orange">
              Em Alta
            </span>
          )}
        </div>

        <p className="text-sm text-text-secondary">
          {cards.length} produtos encontrados com precos comparados em tempo real.
        </p>
      </div>

      {/* Products grid */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {cards.map((card, i) => (
            <OfferCard key={card.id} product={card} page="descobrir" position={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-text-muted">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum produto encontrado para &ldquo;{payload.query}&rdquo;.</p>
        </div>
      )}

      {/* FAQs */}
      {payload.seo.faqs && payload.seo.faqs.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display font-bold text-lg text-text-primary mb-4">
            Perguntas Frequentes
          </h2>
          <div className="space-y-3">
            {payload.seo.faqs.map((faq, i) => (
              <details key={i} className="group rounded-lg border border-surface-200 bg-surface-50">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-text-primary">
                  {faq.question}
                </summary>
                <p className="px-4 pb-3 text-sm text-text-secondary">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related links */}
      {relatedLinks.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display font-bold text-lg text-text-primary mb-3">
            Explore Tambem
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {relatedLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className="flex items-center gap-2 p-3 rounded-lg border border-surface-200 bg-surface-50 hover:bg-surface-100 text-sm text-text-primary hover:text-brand-500 transition-colors"
              >
                <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="line-clamp-1">{link.label}</span>
                <ArrowRight className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: payload.seo.h1,
            numberOfItems: cards.length,
            itemListElement: cards.slice(0, 10).map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${process.env.NEXT_PUBLIC_APP_URL}/produto/${c.slug}`,
              name: c.name,
            })),
          }),
        }}
      />
    </div>
  )
}
