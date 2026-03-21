import { Metadata } from "next"
import Link from "next/link"
import prisma from "@/lib/db/prisma"
import OfferCard from "@/components/cards/OfferCard"
import SearchBar from "@/components/search/SearchBar"
import { notFound } from "next/navigation"

// ── SEO Landing Pages ───────────────────────────────────────────────────────
// Auto-generated pages like /melhor/celular-ate-2000, /melhor/notebook-para-trabalho
// ISR with 5 minute revalidation for fresh pricing data.

export const revalidate = 300

interface LandingConfig {
  title: string
  heading: string
  description: string
  query: string
  maxPrice?: number
  category?: string
}

const LANDING_PAGES: Record<string, LandingConfig> = {
  "celular-ate-1000": { title: "Melhor Celular até R$ 1.000", heading: "Melhores Celulares até R$ 1.000", description: "Compare os melhores celulares por menos de R$ 1.000 com preços verificados e histórico de 90 dias.", query: "celular smartphone", maxPrice: 1000, category: "celulares" },
  "celular-ate-1500": { title: "Melhor Celular até R$ 1.500", heading: "Melhores Celulares até R$ 1.500", description: "Os melhores smartphones até R$ 1.500 comparados entre Amazon, ML e Shopee.", query: "celular smartphone", maxPrice: 1500, category: "celulares" },
  "celular-ate-2000": { title: "Melhor Celular até R$ 2.000", heading: "Melhores Celulares até R$ 2.000", description: "Descubra os melhores celulares por até R$ 2.000 com comparação de preços em tempo real.", query: "celular smartphone", maxPrice: 2000, category: "celulares" },
  "celular-ate-3000": { title: "Melhor Celular até R$ 3.000", heading: "Melhores Celulares até R$ 3.000", description: "Compare celulares premium até R$ 3.000 nas principais lojas do Brasil.", query: "celular smartphone", maxPrice: 3000, category: "celulares" },
  "notebook-para-trabalho": { title: "Melhor Notebook para Trabalho", heading: "Melhores Notebooks para Trabalho", description: "Compare notebooks ideais para trabalho e home office com os melhores preços.", query: "notebook trabalho office", category: "notebooks" },
  "notebook-ate-3000": { title: "Melhor Notebook até R$ 3.000", heading: "Melhores Notebooks até R$ 3.000", description: "Notebooks bons e baratos até R$ 3.000 comparados em tempo real.", query: "notebook laptop", maxPrice: 3000, category: "notebooks" },
  "notebook-ate-4000": { title: "Melhor Notebook até R$ 4.000", heading: "Melhores Notebooks até R$ 4.000", description: "Os melhores notebooks até R$ 4.000 para trabalho, estudo e entretenimento.", query: "notebook laptop", maxPrice: 4000, category: "notebooks" },
  "fone-bluetooth": { title: "Melhor Fone Bluetooth", heading: "Melhores Fones Bluetooth", description: "Compare fones Bluetooth com cancelamento de ruído, qualidade de áudio e melhor preço.", query: "fone bluetooth headphone", category: "audio" },
  "smart-tv-55": { title: "Melhor Smart TV 55\"", heading: "Melhores Smart TVs 55 Polegadas", description: "Compare as melhores Smart TVs de 55 polegadas com preços atualizados.", query: "smart tv 55 polegadas 4k", category: "smart-tvs" },
  "airfryer": { title: "Melhor Air Fryer", heading: "Melhores Air Fryers", description: "Compare as melhores air fryers com preços verificados e avaliações reais.", query: "airfryer fritadeira", category: "casa" },
  "smartwatch": { title: "Melhor Smartwatch", heading: "Melhores Smartwatches", description: "Compare smartwatches de todas as marcas com os menores preços do Brasil.", query: "smartwatch relogio inteligente", category: "wearables" },
  "monitor-gamer": { title: "Melhor Monitor Gamer", heading: "Melhores Monitores Gamer", description: "Compare monitores gamer com alta taxa de atualização e menor preço.", query: "monitor gamer 144hz", category: "informatica" },
  "console-playstation-xbox": { title: "PlayStation vs Xbox — Qual Comprar?", heading: "PlayStation vs Xbox — Melhores Preços", description: "Compare PS5, Xbox Series X/S e Switch com preços atualizados.", query: "playstation xbox console", category: "gamer" },
  "perfume-importado": { title: "Melhores Perfumes Importados", heading: "Perfumes Importados com Melhor Preço", description: "Compare perfumes importados entre lojas brasileiras. Preços verificados.", query: "perfume importado", category: "beleza" },
  "tenis-corrida": { title: "Melhores Tênis para Corrida", heading: "Tênis para Corrida com Melhor Preço", description: "Compare tênis Nike, Adidas, Asics e mais nas principais lojas.", query: "tenis corrida nike adidas", category: "tenis" },
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const config = LANDING_PAGES[slug]
  if (!config) return { title: "Não encontrado" }

  return {
    title: `${config.title} (2026) — PromoSnap`,
    description: config.description,
    openGraph: {
      title: config.title,
      description: config.description,
      type: "website",
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(LANDING_PAGES).map(slug => ({ slug }))
}

export default async function LandingPage({ params }: PageProps) {
  const { slug } = await params
  const config = LANDING_PAGES[slug]
  if (!config) notFound()

  // Fetch products from catalog
  const where: any = {
    status: "ACTIVE",
    listings: { some: { offers: { some: { isActive: true } } } },
  }

  if (config.category) {
    where.category = { slug: config.category }
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { name: true, slug: true } },
      listings: {
        include: {
          source: { select: { name: true, slug: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
          },
        },
        take: 1,
      },
    },
    orderBy: { popularityScore: "desc" },
    take: 50,
  })

  // Filter by maxPrice and map to ProductCard format
  const cards = products
    .map((p) => {
      const listing = p.listings[0]
      const offer = listing?.offers[0]
      if (!offer || !offer.currentPrice) return null
      if (config.maxPrice && offer.currentPrice > config.maxPrice) return null

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl || listing?.imageUrl || "",
        bestOffer: {
          offerId: offer.id,
          price: offer.currentPrice,
          originalPrice: offer.originalPrice,
          discount: offer.originalPrice && offer.originalPrice > offer.currentPrice
            ? Math.round((1 - offer.currentPrice / offer.originalPrice) * 100)
            : null,
          sourceName: listing?.source?.name || "PromoSnap",
          affiliateUrl: offer.affiliateUrl || "#",
          isFreeShipping: offer.isFreeShipping,
          offerScore: offer.offerScore,
        },
        offersCount: 1,
        category: p.category ? { name: p.category.name, slug: p.category.slug } : undefined,
        badges: [],
      }
    })
    .filter(Boolean)
    .slice(0, 20)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary mb-2">
          {config.heading}
        </h1>
        <p className="text-sm text-text-muted max-w-2xl">
          {config.description}
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Product grid */}
      {cards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {cards.map((card: any) => (
            <OfferCard key={card.id} product={card} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-text-muted">Nenhum produto encontrado nesta faixa de preço.</p>
          <Link href="/busca" className="text-brand-500 hover:underline text-sm mt-2 inline-block">
            Buscar todos os produtos
          </Link>
        </div>
      )}

      {/* Internal links for SEO */}
      <div className="mt-10 border-t border-surface-200 pt-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Veja também</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LANDING_PAGES)
            .filter(([s]) => s !== slug)
            .slice(0, 8)
            .map(([s, c]) => (
              <Link
                key={s}
                href={`/melhor/${s}`}
                className="text-xs px-3 py-1.5 rounded-full border border-surface-200 text-text-secondary hover:border-brand-500/30 hover:text-brand-600 transition-colors"
              >
                {c.title}
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
