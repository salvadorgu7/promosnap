import { Metadata } from "next"
import prisma from "@/lib/db/prisma"
import { computeWaitScore, type WaitScore } from "@/lib/decision/wait-score"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"
import { Clock, TrendingDown, Bell, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Vale Esperar? — Produtos com Previsao de Queda",
  description:
    "Descubra quais produtos estao com tendencia de queda de preco. Analise preditiva baseada em historico real de 90 dias.",
}

export const revalidate = 3600

interface WaitProduct {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  currentPrice: number
  categoryName: string | null
  categorySlug: string | null
  waitScore: WaitScore
}

async function getWaitProducts(): Promise<WaitProduct[]> {
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      listings: {
        some: {
          status: "ACTIVE",
          offers: {
            some: { isActive: true, currentPrice: { gt: 0 } },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      category: { select: { name: true, slug: true } },
      listings: {
        where: { status: "ACTIVE" },
        select: {
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
            select: {
              currentPrice: true,
              priceSnapshots: {
                orderBy: { capturedAt: "asc" },
                select: { price: true, originalPrice: true, capturedAt: true },
              },
            },
          },
        },
      },
    },
    take: 100,
  })

  const results: WaitProduct[] = []

  for (const p of products) {
    const offer = p.listings[0]?.offers[0]
    if (!offer || offer.priceSnapshots.length < 5) continue

    const ws = computeWaitScore(
      offer.priceSnapshots,
      offer.currentPrice,
      p.category?.slug ?? undefined
    )

    if (ws.shouldWait && ws.score >= 50 && ws.expectedSavings > 0) {
      results.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        currentPrice: offer.currentPrice,
        categoryName: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        waitScore: ws,
      })
    }
  }

  return results.sort((a, b) => b.waitScore.expectedSavings - a.waitScore.expectedSavings).slice(0, 30)
}

export default async function ValeEsperarPage() {
  const products = await getWaitProducts()

  // Group by category
  const grouped = new Map<string, WaitProduct[]>()
  for (const p of products) {
    const cat = p.categoryName ?? "Outros"
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(p)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-orange/10 text-accent-orange text-sm font-medium mb-3">
          <Clock className="w-4 h-4" />
          Analise Preditiva
        </div>
        <h1 className="font-display text-3xl font-bold text-text-primary">
          Vale Esperar?
        </h1>
        <p className="text-text-secondary mt-2 max-w-xl mx-auto">
          Produtos com tendencia de queda de preco. Baseado em velocidade de variacao,
          sazonalidade e historico real de 90 dias.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum produto com previsao de queda no momento.</p>
          <p className="text-sm mt-1">Volte em breve — analisamos diariamente.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <section key={category}>
              <h2 className="font-display font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-accent-orange" />
                {category}
              </h2>

              <div className="grid gap-3">
                {items.map((p) => (
                  <Link
                    key={p.id}
                    href={`/produto/${p.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors group"
                  >
                    {/* Image */}
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-16 h-16 object-contain rounded-lg bg-white flex-shrink-0"
                        loading="lazy"
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-brand-500 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-lg font-bold font-display text-text-primary mt-0.5">
                        {formatPrice(p.currentPrice)}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">{p.waitScore.reason}</p>
                    </div>

                    {/* Wait badge */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="px-2 py-1 rounded-lg bg-accent-orange/10 text-accent-orange text-xs font-bold">
                        Espere ~{p.waitScore.daysToWait}d
                      </span>
                      <span className="text-xs text-accent-green font-medium">
                        Economia: ~{formatPrice(p.waitScore.expectedSavings)}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Confianca: {p.waitScore.confidence === 'high' ? 'Alta' : p.waitScore.confidence === 'medium' ? 'Media' : 'Baixa'}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand-500 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-10 text-center py-8 bg-surface-50 rounded-xl border border-surface-200">
        <Bell className="w-8 h-8 text-brand-500 mx-auto mb-2" />
        <h3 className="font-display font-bold text-text-primary">Quer ser avisado na queda?</h3>
        <p className="text-sm text-text-secondary mt-1 mb-3">
          Crie um alerta de preco e receba um email quando o produto cair.
        </p>
        <Link
          href="/alertas"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
        >
          <Bell className="w-4 h-4" />
          Gerenciar Alertas
        </Link>
      </div>
    </div>
  )
}
