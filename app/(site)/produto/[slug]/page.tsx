import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  ShoppingCart,
  Star,
  BarChart3,
  Store,
  Shield,
  Clock,
  Package,
  Share2,
  Tag,
} from "lucide-react";
import PriceChart from "@/components/charts/PriceChart";
import Breadcrumb from "@/components/ui/Breadcrumb";
import OfferCard from "@/components/cards/OfferCard";
import MobileCTA from "@/components/product/MobileCTA";
import ShareButtons from "@/components/product/ShareButtons";
import PriceAlertForm from "@/components/product/PriceAlertForm";
import PriceComparison from "@/components/product/PriceComparison";
import SavingsBlock from "@/components/product/SavingsBlock";
import PriceTrend from "@/components/product/PriceTrend";
import { buildMetadata, productSchema, breadcrumbSchema } from "@/lib/seo/metadata";
import { formatPrice } from "@/lib/utils";
import {
  getProductBySlug,
  getSimilarProducts,
  getPriceHistory,
} from "@/lib/db/queries";
import type { PriceHistoryPoint, PriceStats } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return buildMetadata({ title: "Produto nao encontrado", noIndex: true });
  }

  const allOffers = product.listings.flatMap((l) => l.offers);
  const bestPrice = allOffers.length > 0 ? Math.min(...allOffers.map((o) => o.currentPrice)) : null;

  return buildMetadata({
    title: `${product.name}${product.brand ? ` - ${product.brand.name}` : ""}${bestPrice ? ` por ${formatPrice(bestPrice)}` : ""} - Melhor Preco`,
    description: product.description
      ? product.description.slice(0, 155)
      : `Compare precos de ${product.name} nas melhores lojas. Encontre o melhor preco.`,
    path: `/produto/${slug}`,
    ogImage: product.imageUrl || undefined,
  });
}

function computePriceStats(
  snapshots: { price: number; originalPrice: number | null; capturedAt: Date }[],
  currentPrice: number
): PriceStats {
  const now = Date.now();
  const day30 = 30 * 86400000;
  const day90 = 90 * 86400000;

  const prices = snapshots.map((s) => s.price);
  const prices30d = snapshots.filter((s) => now - s.capturedAt.getTime() < day30).map((s) => s.price);
  const prices90d = snapshots.filter((s) => now - s.capturedAt.getTime() < day90).map((s) => s.price);

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : currentPrice);
  const min = (arr: number[]) => (arr.length > 0 ? Math.min(...arr) : currentPrice);
  const max = (arr: number[]) => (arr.length > 0 ? Math.max(...arr) : currentPrice);

  const avg30 = avg(prices30d);
  let trend: "up" | "down" | "stable" = "stable";
  if (currentPrice < avg30 * 0.95) trend = "down";
  else if (currentPrice > avg30 * 1.05) trend = "up";

  return {
    current: currentPrice,
    min30d: min(prices30d),
    max30d: max(prices30d),
    avg30d: Math.round(avg30 * 100) / 100,
    min90d: min(prices90d),
    max90d: max(prices90d),
    avg90d: Math.round(avg(prices90d) * 100) / 100,
    allTimeMin: min(prices),
    trend,
  };
}

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Flatten all offers with source info
  const allOffers = product.listings
    .flatMap((listing) =>
      listing.offers.map((offer) => ({
        id: offer.id,
        sourceName: listing.source.name,
        sourceSlug: listing.source.slug,
        seller: listing.rawTitle,
        price: offer.currentPrice,
        originalPrice: offer.originalPrice,
        isFreeShipping: offer.isFreeShipping,
        couponText: offer.couponText,
        installmentText: offer.installmentText,
        rating: listing.rating,
        reviewsCount: listing.reviewsCount,
        affiliateUrl: offer.affiliateUrl || "#",
        offerScore: offer.offerScore,
      }))
    )
    .sort((a, b) => a.price - b.price);

  const bestOffer = allOffers[0] || null;
  const bestPrice = bestOffer?.price ?? 0;

  // Price history from best offer
  let priceHistory: PriceHistoryPoint[] = [];
  let priceStats: PriceStats | null = null;
  const hasSufficientHistory = false;

  if (bestOffer) {
    const snapshots = await getPriceHistory(bestOffer.id, 90);
    if (snapshots.length >= 3) {
      priceHistory = snapshots.map((s) => ({
        date: s.capturedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        price: s.price,
        originalPrice: s.originalPrice ?? undefined,
      }));
      priceStats = computePriceStats(snapshots, bestOffer.price);
    }
  }

  // Similar products
  const similarProducts = await getSimilarProducts(product.category?.slug, slug, 8);

  // Installment calculation
  const installmentCount = 12;
  const showInstallment = bestPrice > 100;
  const installmentValue = showInstallment ? bestPrice / installmentCount : 0;

  // Discount
  const discount =
    bestOffer?.originalPrice && bestOffer.originalPrice > bestOffer.price
      ? Math.round(((bestOffer.originalPrice - bestOffer.price) / bestOffer.originalPrice) * 100)
      : null;

  // Specs
  const specs = product.specsJson as Record<string, string> | null;

  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://promosnap.com.br"}/produto/${slug}`;

  // Schema.org
  const schemaOffers = allOffers.map((o) => ({
    price: o.price,
    url: o.affiliateUrl,
    seller: o.sourceName,
    availability: "InStock",
  }));

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(product.category
      ? [{ label: product.category.name, href: `/categoria/${product.category.slug}` }]
      : []),
    { label: product.name },
  ];

  const breadcrumbSchemaItems = [
    { name: "Home", url: "/" },
    ...(product.category
      ? [{ name: product.category.name, url: `/categoria/${product.category.slug}` }]
      : []),
    { name: product.name, url: `/produto/${slug}` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 lg:pb-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productSchema({
              name: product.name,
              description: product.description || undefined,
              imageUrl: product.imageUrl || undefined,
              brand: product.brand?.name,
              offers: schemaOffers,
            })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema(breadcrumbSchemaItems)),
        }}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: Image */}
        <div className="lg:col-span-1 space-y-4">
          {/* Product image */}
          <div className="card aspect-square flex items-center justify-center p-8 overflow-hidden">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <ShoppingCart className="h-24 w-24 text-surface-300" />
            )}
          </div>

          {/* Specs section */}
          {specs && Object.keys(specs).length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-text-muted" /> Especificacoes
              </h3>
              <div className="space-y-2">
                {Object.entries(specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm gap-2">
                    <span className="text-text-muted flex-shrink-0">{key}</span>
                    <span className="text-text-secondary font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About this product */}
          {product.description && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Sobre este produto</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>

        {/* Right column: Info + Offers + Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product header */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {product.brand && (
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {product.brand.name}
                </span>
              )}
              {discount && discount >= 20 && (
                <span className="badge-lowest">Preco em queda</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-2">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
                {product.description}
              </p>
            )}
          </div>

          {/* Price trend indicator */}
          {priceStats && (
            <PriceTrend trend={priceStats.trend} currentPrice={priceStats.current} avgPrice={priceStats.avg30d} />
          )}

          {/* Best price highlight card */}
          {bestOffer && (
            <div className="card p-5 border-accent-blue/30 bg-accent-blue/5">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">Melhor preco encontrado</p>
                  <div className="flex items-end gap-2">
                    {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
                      <span className="price-old text-base">{formatPrice(bestOffer.originalPrice)}</span>
                    )}
                    {discount && <span className="discount-tag">-{discount}%</span>}
                  </div>
                  <p className="text-3xl font-bold text-accent-blue font-display mt-1">
                    {formatPrice(bestPrice)}
                  </p>
                  {showInstallment && (
                    <p className="text-sm text-text-muted mt-1">
                      ou {installmentCount}x de {formatPrice(installmentValue)}
                    </p>
                  )}
                  <p className="text-xs text-text-muted mt-1">em {bestOffer.sourceName}</p>
                </div>
                <a
                  href={bestOffer.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn-primary flex items-center gap-2 px-6 py-3"
                >
                  <ExternalLink className="h-4 w-4" /> Ver Oferta
                </a>
              </div>
            </div>
          )}

          {/* Offer comparison table */}
          {allOffers.length > 0 && (
            <div>
              <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
                <Store className="h-4 w-4 text-text-muted" /> Comparar Precos ({allOffers.length}{" "}
                {allOffers.length === 1 ? "oferta" : "ofertas"})
              </h2>
              <div className="space-y-2">
                {allOffers.map((offer, i) => {
                  const offerDiscount =
                    offer.originalPrice && offer.originalPrice > offer.price
                      ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
                      : null;

                  return (
                    <div
                      key={offer.id}
                      className={`card flex items-center gap-4 p-4 ${
                        i === 0 ? "border-accent-blue/30 bg-accent-blue/5" : ""
                      }`}
                    >
                      {/* Rank */}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                          i === 0
                            ? "bg-accent-blue text-white"
                            : "bg-surface-100 text-text-muted"
                        }`}
                      >
                        {i + 1}
                      </div>

                      {/* Source + seller info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary">{offer.sourceName}</p>
                        <p className="text-xs text-text-muted truncate">{offer.seller}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {offer.rating != null && (
                            <span className="flex items-center gap-0.5 text-xs text-accent-orange">
                              <Star className="h-3 w-3 fill-current" /> {offer.rating.toFixed(1)}
                              {offer.reviewsCount != null && (
                                <span className="text-text-muted">({offer.reviewsCount})</span>
                              )}
                            </span>
                          )}
                          {offer.isFreeShipping && (
                            <span className="badge-shipping text-[10px] px-1.5 py-0">Frete gratis</span>
                          )}
                          {offer.couponText && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-orange font-medium">
                              <Tag className="h-2.5 w-2.5" />
                              {offer.couponText}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        {offer.originalPrice && offer.originalPrice > offer.price && (
                          <p className="text-xs text-text-muted line-through">
                            {formatPrice(offer.originalPrice)}
                          </p>
                        )}
                        <p
                          className={`text-lg font-bold font-display ${
                            i === 0 ? "text-accent-blue" : "text-text-primary"
                          }`}
                        >
                          {formatPrice(offer.price)}
                        </p>
                        {offerDiscount && (
                          <p className="text-xs text-accent-green font-medium">-{offerDiscount}%</p>
                        )}
                        {offer.price > 100 && (
                          <p className="text-[10px] text-text-muted">
                            12x {formatPrice(offer.price / 12)}
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <a
                        href={offer.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          i === 0 ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Ver
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price history */}
          <div>
            <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-text-muted" /> Historico de Preco
            </h2>
            {priceHistory.length >= 3 && priceStats ? (
              <>
                <PriceChart data={priceHistory} stats={priceStats} />
                <Link href={`/preco/${slug}`} className="mt-2 inline-block text-xs text-accent-blue hover:underline">
                  Ver historico completo →
                </Link>
              </>
            ) : (
              <div className="card p-6 flex items-center gap-3 text-center justify-center">
                <Clock className="h-5 w-5 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    Monitorando precos...
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Estamos coletando dados de preco. O historico estara disponivel em breve.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Savings block */}
          {bestOffer && (
            <SavingsBlock
              currentPrice={bestPrice}
              originalPrice={bestOffer.originalPrice ?? undefined}
              highestPrice={allOffers.length > 1 ? Math.max(...allOffers.map((o) => o.price)) : undefined}
              avgHistorical={priceStats?.avg30d}
            />
          )}

          {/* Share section */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-text-muted" /> Compartilhar
            </h3>
            <ShareButtons
              url={productUrl}
              title={product.name}
              price={bestOffer ? formatPrice(bestPrice) : ""}
            />
          </div>

          {/* Price Alert */}
          {bestOffer && product.listings[0] && (
            <PriceAlertForm
              listingId={product.listings[0].id}
              currentPrice={bestPrice}
              productName={product.name}
            />
          )}

          {/* Trust disclaimer */}
          <div className="card p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent-blue flex-shrink-0" />
            <p className="text-xs text-text-muted leading-relaxed">
              Os precos sao atualizados periodicamente. O PromoSnap nao vende produtos &mdash; ao
              clicar em &ldquo;Ver Oferta&rdquo;, voce e redirecionado para a loja parceira. Podemos
              receber comissoes por compras realizadas via nossos links.
            </p>
          </div>
        </div>
      </div>

      {/* Similar products rail */}
      {similarProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold font-display text-text-primary mb-4">
            Produtos Similares
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {similarProducts.map((p) => (
              <OfferCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile CTA */}
      {bestOffer && (
        <MobileCTA
          price={bestPrice}
          affiliateUrl={bestOffer.affiliateUrl}
          sourceName={bestOffer.sourceName}
        />
      )}
    </div>
  );
}
