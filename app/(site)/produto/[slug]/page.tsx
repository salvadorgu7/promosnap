import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Users,
} from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import PriceChart from "@/components/charts/PriceChartLazy";
import OfferCard from "@/components/cards/OfferCard";
import MobileProductActions from "@/components/product/MobileProductActions";
import ShareButtons from "@/components/product/ShareButtons";
import PriceAlertForm from "@/components/product/PriceAlertForm";
import SavingsBlock from "@/components/product/SavingsBlock";
import PriceTrend from "@/components/product/PriceTrend";
import ConsolidatedRatingComponent from "@/components/product/ConsolidatedRating";
import CategoryInsightsComponent from "@/components/product/CategoryInsights";
import ShippingBadge from "@/components/product/ShippingBadge";
import ContextualNav from "@/components/product/ContextualNav";
import DecisionSummary from "@/components/product/DecisionSummary";
import SmartDecisionBlock from "@/components/product/SmartDecisionBlock";
import SmartInsight from "@/components/product/SmartInsight";
import TrustSignals from "@/components/product/TrustSignals";
import PriceStabilityBadge from "@/components/product/PriceStabilityBadge";
import OpportunityScore from "@/components/product/OpportunityScore";
import BetterAlternativeHint from "@/components/product/BetterAlternativeHint";
import QuickCompare from "@/components/product/QuickCompare";
import ContinueExploring from "@/components/product/ContinueExploring";
import AmazonAlternative from "@/components/product/AmazonAlternative";
import RelatedContent from "@/components/seo/RelatedContent";
import { getRelatedLinks } from "@/lib/seo/internal-links";
import UrgencySignals from "@/components/product/UrgencySignals";
import CommercialCTA from "@/components/product/CommercialCTA";
import PriceDropAlert from "@/components/engagement/PriceDropAlert";
import WhyHighlighted from "@/components/product/WhyHighlighted";
import CanonicalView from "@/components/product/CanonicalView";
import MiniCluster from "@/components/product/MiniCluster";
import DecisionTracker from "@/components/product/DecisionTracker";
import PageViewTracker from "@/components/analytics/PageViewTracker";
import SourceComparison from "@/components/product/SourceComparison";
import PriceComparison from "@/components/product/PriceComparison";
import DecisionBlocks from "@/components/product/DecisionBlocks";
import { analyzeCrossSource, buildCrossSourceOffer } from "@/lib/source/cross-source";
import { getCanonicalComparison, getBestChoice } from "@/lib/catalog/smart-comparison";
import { buildMetadata, productSchema, breadcrumbSchema } from "@/lib/seo/metadata";
import { findComparisonsForProduct } from "@/lib/seo/comparisons";
import { formatPrice } from "@/lib/utils";
import {
  getProductBySlug,
  getSimilarProducts,
  getAlternatives,
  getPriceHistory,
} from "@/lib/db/queries";
import { getConsolidatedRating } from "@/lib/reviews/consolidated";
import { getCategoryInsights } from "@/lib/reviews/ranking";
import { getShippingSignals } from "@/lib/shipping/intelligence";
import prisma from "@/lib/db/prisma";
import { computePriceStats } from "@/lib/price/analytics";
import { generateBuySignal } from "@/lib/decision/buy-signal";
import { getFlag } from "@/lib/config/feature-flags";
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
        lastSeenAt: offer.lastSeenAt,
      }))
    )
    .sort((a, b) => a.price - b.price);

  const bestOffer = allOffers[0] || null;
  const bestPrice = bestOffer?.price ?? 0;

  // Price history from best offer
  let priceHistory: PriceHistoryPoint[] = [];
  let priceStats: PriceStats | null = null;

  if (bestOffer) {
    const snapshots = await getPriceHistory(bestOffer.id, 90);
    const hasTimeSpread = snapshots.length >= 3 &&
      (snapshots[snapshots.length - 1].capturedAt.getTime() - snapshots[0].capturedAt.getTime()) > 24 * 60 * 60 * 1000;
    if (hasTimeSpread) {
      priceHistory = snapshots.map((s) => ({
        date: s.capturedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        price: s.price,
        originalPrice: s.originalPrice ?? undefined,
      }));
      priceStats = computePriceStats(snapshots, bestOffer.price);
    }
  }

  // Similar products + alternatives in same price range
  const [similarProducts, alternatives] = await Promise.all([
    getSimilarProducts(product.category?.slug, slug, 8),
    getAlternatives(product.category?.slug, bestPrice, product.id, 6),
  ]);

  // Consolidated rating
  const consolidatedRating = await getConsolidatedRating(product.id);

  // Category insights
  const categoryInsight = product.categoryId
    ? await getCategoryInsights(product.id, product.categoryId)
    : null;

  // Fetch product variants
  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id },
    select: {
      id: true,
      variantName: true,
      color: true,
      size: true,
      storage: true,
    },
    orderBy: { variantName: "asc" },
  }).catch(() => []);

  // Count distinct sources for canonical view
  const distinctSources = new Set(product.listings.map((l) => l.source.slug));

  // Shipping signals for each offer
  const offersWithShipping = allOffers.map((offer) => ({
    ...offer,
    shipping: getShippingSignals({
      isFreeShipping: offer.isFreeShipping,
      currentPrice: offer.price,
      sourceSlug: offer.sourceSlug,
    }),
  }));

  // Cross-source comparison
  const crossSourceOffers = allOffers.map((offer) =>
    buildCrossSourceOffer({
      id: offer.id,
      currentPrice: offer.price,
      originalPrice: offer.originalPrice ?? undefined,
      offerScore: offer.offerScore,
      sourceSlug: offer.sourceSlug,
      sourceName: offer.sourceName,
      affiliateUrl: offer.affiliateUrl,
      isFreeShipping: offer.isFreeShipping,
    })
  );
  const crossSourceAnalysis = analyzeCrossSource(crossSourceOffers);

  // Smart comparison — decision blocks with reasoning
  const smartComparison = await getCanonicalComparison(product.id);
  const bestChoiceResult = smartComparison ? getBestChoice(smartComparison.matrix) : null;

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

  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"}/produto/${slug}`;

  // Last-updated relative time
  const lastSeenLabel = (() => {
    if (!bestOffer?.lastSeenAt) return null;
    const diffMs = Date.now() - new Date(bestOffer.lastSeenAt).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return "Atualizado agora";
    if (diffHours < 24) return `Atualizado ha ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 0) return "Atualizado hoje";
    if (diffDays === 1) return "Atualizado ontem";
    return `Atualizado ha ${diffDays} dias`;
  })();

  // Price context: below 30d avg
  const priceBelowAvg30d = priceStats?.avg30d && bestPrice < priceStats.avg30d
    ? Math.round(((priceStats.avg30d - bestPrice) / priceStats.avg30d) * 100)
    : null;

  // Price context: near all-time low (within 5%)
  const isNearAllTimeLow = priceStats?.allTimeMin
    ? bestPrice <= priceStats.allTimeMin * 1.05
    : false;

  // Buy signal (feature-flagged)
  const buySignal = priceStats && getFlag('buySignals')
    ? generateBuySignal(bestPrice, priceStats, {
        offersCount: allOffers.length,
        isFreeShipping: bestOffer?.isFreeShipping ?? false,
        discount,
      })
    : null;

  // Social proof: popularity score
  const showSocialProof = product.popularityScore > 10;
  const viewCountDisplay = Math.round(product.popularityScore * 12);

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

  // Brand slug for contextual nav
  const brandSlug = product.brand?.name
    ? product.brand.name.toLowerCase().replace(/\s+/g, "-")
    : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-20 lg:pb-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} />

      {/* JSON-LD: Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            productSchema({
              name: product.name,
              description: product.description || undefined,
              imageUrl: product.imageUrl || undefined,
              brand: product.brand?.name,
              sku: product.id,
              rating: consolidatedRating?.consolidatedRating,
              reviewCount: consolidatedRating?.totalReviews,
              offers: schemaOffers,
            })
          ),
        }}
      />
      {/* JSON-LD: Breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema(breadcrumbSchemaItems)),
        }}
      />
      {/* JSON-LD: FAQ — rich snippets in Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Qual o menor preço de ${product.name}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: bestOffer
                    ? `O menor preço encontrado para ${product.name} é ${formatPrice(bestPrice)} em ${bestOffer.sourceName}.${priceStats?.allTimeMin ? ` O menor preço histórico registrado foi ${formatPrice(priceStats.allTimeMin)}.` : ""}`
                    : `Estamos monitorando os preços de ${product.name} em diversas lojas.`,
                },
              },
              {
                "@type": "Question",
                name: `Vale a pena comprar ${product.name} agora?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: priceStats?.trend === "down"
                    ? `Sim, o preço de ${product.name} está em tendência de queda e abaixo da média dos últimos 30 dias.`
                    : priceStats?.trend === "up"
                    ? `O preço de ${product.name} está em alta. Considere ativar um alerta de preço para ser notificado quando baixar.`
                    : `${product.name} está com preço estável. Compare ofertas em ${allOffers.length} loja${allOffers.length !== 1 ? "s" : ""} para encontrar a melhor opção.`,
                },
              },
              ...(allOffers.length > 1
                ? [{
                    "@type": "Question",
                    name: `Onde comprar ${product.name} mais barato?`,
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: `Comparamos preços de ${product.name} em ${allOffers.length} ofertas. O menor preço é ${formatPrice(bestPrice)} em ${bestOffer?.sourceName || "diversas lojas"}.`,
                    },
                  }]
                : []),
            ],
          }),
        }}
      />

      {/* Analytics & Decision logging */}
      <PageViewTracker
        type="product"
        productId={product.id}
        slug={slug}
        category={product.category?.slug}
        price={bestPrice || undefined}
      />
      <DecisionTracker productId={product.id} productSlug={slug} productName={product.name} />

      {/* Mobile contextual nav */}
      <div className="lg:hidden mb-4">
        <ContextualNav
          slug={slug}
          categoryName={product.category?.name}
          categorySlug={product.category?.slug}
          brandName={product.brand?.name}
          brandSlug={brandSlug}
          hasPriceAlert={!!bestOffer}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column: Image + contextual nav */}
        <div className="lg:col-span-1 space-y-4">
          {/* Product image */}
          <div className="card aspect-square relative flex items-center justify-center p-8 overflow-hidden image-container">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain drop-shadow-sm p-4"
                sizes="(max-width: 1024px) 100vw, 33vw"
                priority
              />
            ) : (
              <ShoppingCart className="h-24 w-24 text-surface-300" />
            )}
          </div>

          {/* Contextual navigation (desktop) */}
          <ContextualNav
            slug={slug}
            categoryName={product.category?.name}
            categorySlug={product.category?.slug}
            brandName={product.brand?.name}
            brandSlug={brandSlug}
            hasPriceAlert={!!bestOffer}
          />

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

          {/* Consolidated rating */}
          {consolidatedRating && (
            <ConsolidatedRatingComponent rating={consolidatedRating} />
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
              {lastSeenLabel && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="h-3 w-3" /> {lastSeenLabel}
                </span>
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
            {showSocialProof && (
              <p className="flex items-center gap-1.5 text-xs text-text-muted mt-1">
                <Users className="h-3 w-3" /> {viewCountDisplay} pessoas viram este produto
              </p>
            )}
          </div>

          {/* Price drop alert — returning visitor notification */}
          {bestOffer && (
            <PriceDropAlert
              productSlug={slug}
              productName={product.name}
              currentPrice={bestPrice}
            />
          )}

          {/* Category insights badges */}
          {categoryInsight && categoryInsight.badges.length > 0 && (
            <CategoryInsightsComponent insight={categoryInsight} />
          )}

          {/* Price trend indicator */}
          {priceStats && (
            <PriceTrend trend={priceStats.trend} currentPrice={priceStats.current} avgPrice={priceStats.avg30d} />
          )}

          {/* Decision Summary */}
          {allOffers.length > 0 && (
            <DecisionSummary
              offers={allOffers}
              productName={product.name}
              avgHistorical={priceStats?.avg30d}
              priceStats={priceStats ? {
                avg30d: priceStats.avg30d,
                min30d: priceStats.min30d,
                allTimeMin: priceStats.allTimeMin,
                trend: priceStats.trend,
              } : null}
            />
          )}

          {/* Smart Decision Analysis */}
          {bestOffer && (
            <SmartDecisionBlock
              productName={product.name}
              currentPrice={bestPrice}
              originalPrice={bestOffer.originalPrice ?? undefined}
              avg30d={priceStats?.avg30d}
              allTimeMin={priceStats?.allTimeMin}
              offersCount={allOffers.length}
              isFreeShipping={bestOffer.isFreeShipping}
              offerScore={bestOffer.offerScore}
              trend={priceStats?.trend}
              buySignal={buySignal}
            />
          )}

          {/* Smart Insight — "Vale a pena agora?" */}
          {priceStats && bestOffer && (
            <SmartInsight
              priceStats={priceStats}
              productName={product.name}
              offerScore={bestOffer.offerScore}
              hasFreShipping={bestOffer.isFreeShipping}
              discount={discount}
            />
          )}

          {/* Opportunity Score assessment */}
          {priceStats && bestOffer && (
            <OpportunityScore
              priceStats={priceStats}
              offerScore={bestOffer.offerScore}
              discount={discount}
              isFreeShipping={bestOffer.isFreeShipping}
              offersCount={allOffers.length}
              sourceSlug={bestOffer.sourceSlug}
            />
          )}

          {/* Better Alternative Hint */}
          {bestOffer && alternatives.length > 0 && (
            <BetterAlternativeHint
              alternatives={alternatives}
              currentPrice={bestOffer.price}
              currentScore={bestOffer.offerScore}
            />
          )}

          {/* Best price highlight card */}
          {bestOffer && (
            <div className="card p-5 border-brand-500/25 bg-brand-50">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-text-muted mb-1">Melhor preco encontrado</p>
                  <div className="flex items-end gap-2">
                    {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
                      <span className="price-old text-base">{formatPrice(bestOffer.originalPrice)}</span>
                    )}
                    {discount && <span className="discount-tag">-{discount}%</span>}
                  </div>
                  <p className="text-3xl font-bold text-brand-600 font-display mt-1">
                    {formatPrice(bestPrice)}
                  </p>
                  {/* Price context badges */}
                  {priceBelowAvg30d && priceBelowAvg30d >= 3 && (
                    <p className="text-xs font-medium text-accent-green mt-1">
                      {priceBelowAvg30d}% abaixo da media dos ultimos 30 dias
                    </p>
                  )}
                  {isNearAllTimeLow && (
                    <p className="text-xs font-medium text-accent-green mt-0.5">
                      Proximo do menor preco historico!
                    </p>
                  )}
                  {showInstallment && (
                    <p className="text-sm text-text-muted mt-1">
                      ou {installmentCount}x de {formatPrice(installmentValue)}
                    </p>
                  )}
                  <p className="text-xs text-text-muted mt-1">em {bestOffer.sourceName}</p>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <a
                    href={`/api/clickout/${bestOffer.id}?page=product`}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="btn-primary flex items-center justify-center gap-2 px-8 py-3.5 text-base font-bold w-full"
                  >
                    <ExternalLink className="h-5 w-5" /> Garantir Desconto na {bestOffer.sourceName}
                  </a>
                  {discount && discount > 20 && (
                    <p className="text-[10px] text-accent-orange font-medium text-center">
                      Preco pode mudar a qualquer momento
                    </p>
                  )}
                  <p className="text-[10px] text-text-muted text-center flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Compra segura via {bestOffer.sourceName}
                  </p>
                </div>
              </div>
              {/* Urgency signals */}
              <UrgencySignals
                priceDropPercent={discount ?? undefined}
                isAllTimeLow={priceStats ? bestPrice <= priceStats.allTimeMin : undefined}
                offerScore={bestOffer.offerScore}
                daysAtCurrentPrice={undefined}
              />
            </div>
          )}

          {/* Commercial CTA — enhanced secondary CTA */}
          {bestOffer && (
            <CommercialCTA
              affiliateUrl={bestOffer.affiliateUrl}
              offerId={bestOffer.id}
              price={bestPrice}
              originalPrice={bestOffer.originalPrice ?? undefined}
              sourceName={bestOffer.sourceName}
              sourceSlug={bestOffer.sourceSlug}
              freeShipping={bestOffer.isFreeShipping}
              installments={showInstallment ? `${installmentCount}x de ${formatPrice(installmentValue)}` : undefined}
              productSlug={slug}
            />
          )}

          {/* Trust signals strip */}
          {priceStats && bestOffer && (
            <TrustSignals
              priceStats={priceStats}
              sourceName={bestOffer.sourceName}
              sourceSlug={bestOffer.sourceSlug}
              offerScore={bestOffer.offerScore}
              isFreeShipping={bestOffer.isFreeShipping}
              offersCount={allOffers.length}
              hasHistory={priceHistory.length >= 3}
            />
          )}

          {/* Why highlighted — transparency block */}
          {bestOffer && (
            <WhyHighlighted
              offerScore={bestOffer.offerScore}
              price={bestOffer.price}
              avgPrice={priceStats?.avg30d}
              rating={bestOffer.rating}
              isFreeShipping={bestOffer.isFreeShipping}
            />
          )}

          {/* Canonical View — all sources for this product */}
          {product.listings.length > 1 && (
            <CanonicalView
              listings={product.listings.map((l) => ({
                id: l.id,
                rawTitle: l.rawTitle,
                rating: l.rating,
                reviewsCount: l.reviewsCount,
                source: l.source,
                offers: l.offers.map((o) => ({
                  id: o.id,
                  currentPrice: o.currentPrice,
                  originalPrice: o.originalPrice,
                  isFreeShipping: o.isFreeShipping,
                  couponText: o.couponText ?? null,
                  offerScore: o.offerScore,
                  affiliateUrl: o.affiliateUrl,
                })),
              }))}
              variants={variants}
              productName={product.name}
            />
          )}

          {/* Decision blocks — smart comparison with reasoning */}
          {smartComparison && smartComparison.matrix.length > 0 && (
            <>
              {smartComparison.matrix.length >= 2 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-brand-500">
                    Comparacao entre {smartComparison.matrix.length} lojas
                  </span>
                  <span className="flex-1 h-px bg-surface-200" />
                </div>
              )}
              <DecisionBlocks
                comparison={smartComparison}
                bestChoice={bestChoiceResult}
                productSlug={slug}
              />
            </>
          )}
          {/* Single source — encourage tracking */}
          {(!smartComparison || smartComparison.matrix.length <= 1) && allOffers.length <= 1 && bestOffer && (
            <div className="p-4 rounded-xl bg-surface-50 border border-surface-200">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Disponivel em 1 loja.</span>{" "}
                Estamos buscando esse produto em mais lojas para comparar precos.
              </p>
            </div>
          )}

          {/* Cross-source comparison */}
          {crossSourceOffers.length > 1 && (
            <SourceComparison
              analysis={crossSourceAnalysis}
              offers={crossSourceOffers}
              productSlug={slug}
            />
          )}

          {/* Cross-store price comparison — rich comparator with badges */}
          {allOffers.length > 1 && (
            <PriceComparison
              productName={product.name}
              offers={allOffers.map((o) => ({
                id: o.id,
                sourceName: o.sourceName,
                sourceSlug: o.sourceSlug,
                price: o.price,
                originalPrice: o.originalPrice,
                isFreeShipping: o.isFreeShipping,
                couponText: o.couponText,
                rating: o.rating,
                reviewsCount: o.reviewsCount,
                affiliateUrl: o.affiliateUrl,
                offerScore: o.offerScore,
                shippingPrice: null,
              }))}
            />
          )}

          {/* Cluster badges */}
          {(distinctSources.size > 1 || variants.length > 0) && product.listings.length <= 1 && (
            <div className="flex items-center gap-2">
              <MiniCluster
                stores={distinctSources.size}
                variants={variants.length}
                offers={allOffers.length}
              />
            </div>
          )}

          {/* Offer comparison table */}
          {offersWithShipping.length > 0 && (
            <div>
              <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
                <Store className="h-4 w-4 text-text-muted" /> Comparar Precos ({offersWithShipping.length}{" "}
                {offersWithShipping.length === 1 ? "oferta" : "ofertas"})
              </h2>
              <div className="space-y-2">
                {offersWithShipping.map((offer, i) => {
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
                          <ShippingBadge
                            freeShipping={offer.shipping.freeShipping}
                            fastDelivery={offer.shipping.fastDelivery}
                            fulfillmentFull={offer.shipping.fulfillmentType === "full"}
                            compact
                          />
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
                        href={`/api/clickout/${offer.id}?page=product`}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
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
                <div className="flex items-center gap-2 mb-3">
                  <PriceStabilityBadge priceStats={priceStats} />
                </div>
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
            <div id="price-alert">
              <PriceAlertForm
                listingId={product.listings[0].id}
                currentPrice={bestPrice}
                productName={product.name}
              />
            </div>
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

      {/* Quick Compare — top 3 alternatives side by side */}
      {alternatives.length >= 2 && (
        <section className="mt-10" id="quick-compare">
          <QuickCompare
            products={alternatives.slice(0, 3)}
            title="Se nao for esse, compare estes"
          />
        </section>
      )}

      {/* Alternatives in same price range */}
      {alternatives.length > 0 && (
        <section className="mt-8" id="alternatives">
          <h2 className="text-xl font-bold font-display text-text-primary mb-1">
            Alternativas na Mesma Faixa
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Produtos similares entre {formatPrice(bestPrice * 0.7)} e {formatPrice(bestPrice * 1.3)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {alternatives.map((p) => (
              <OfferCard key={p.id} product={p} railSource="alternatives" page="product" />
            ))}
          </div>
        </section>
      )}

      {/* Comparison links */}
      {(() => {
        const comparisons = findComparisonsForProduct(product.name);
        if (comparisons.length === 0) return null;
        return (
          <section className="mt-8">
            <h3 className="text-lg font-bold font-display text-text-primary mb-3">
              Compare
            </h3>
            <div className="flex flex-wrap gap-2">
              {comparisons.map((c) => (
                <Link
                  key={c.slug}
                  href={`/comparar/${c.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-50 border border-surface-200 text-sm font-medium text-text-primary hover:border-brand-500/30 hover:bg-brand-50 transition-colors"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-brand-500" />
                  vs {c.otherProduct}
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Similar products rail */}
      {similarProducts.length > 0 && (
        <section className="mt-10" id="similar-products">
          <h2 className="text-xl font-bold font-display text-text-primary mb-4">
            Produtos Similares
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {similarProducts.map((p) => (
              <OfferCard key={p.id} product={p} railSource="similar" page="product" />
            ))}
          </div>
        </section>
      )}

      {/* Amazon alternative — show when best offer is not from Amazon */}
      {product.name && (!bestOffer || !bestOffer.sourceSlug.includes("amazon")) && (
        <section className="mt-8">
          <AmazonAlternative
            productName={product.name}
            category={product.category?.name}
          />
        </section>
      )}

      {/* Continue Exploring */}
      <ContinueExploring
        productName={product.name}
        categorySlug={product.category?.slug}
        categoryName={product.category?.name}
      />

      {/* Related Content — SEO internal linking */}
      <RelatedContent
        links={getRelatedLinks({
          categorySlug: product.category?.slug,
          brandSlug: brandSlug,
          productName: product.name,
          limit: 6,
        })}
        title="Conteudo Relacionado"
      />

      {/* Sticky mobile actions bar */}
      {bestOffer && (
        <MobileProductActions
          offerId={bestOffer.id}
          price={bestPrice}
          sourceName={bestOffer.sourceName}
          productSlug={slug}
          productName={product.name}
          discount={discount ?? undefined}
        />
      )}
    </div>
  );
}
