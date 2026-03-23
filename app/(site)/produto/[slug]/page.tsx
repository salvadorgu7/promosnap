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
  Zap,
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
// AmazonAlternative removed — low conversion
import RelatedContent from "@/components/seo/RelatedContent";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import CrossClusterLinks from "@/components/seo/CrossClusterLinks";
import LiveViewers from "@/components/product/LiveViewers";
import SimilarProducts from "@/components/product/SimilarProducts";
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
import HeroVerdict from "@/components/product/HeroVerdict";
import MobileDecisionCompact from "@/components/product/MobileDecisionCompact";
import InlineAlertPrompt from "@/components/product/InlineAlertPrompt";
import UseCaseRecommendation from "@/components/product/UseCaseRecommendation";
import ProductCaveat from "@/components/product/ProductCaveat";
import ExpandedAlternatives from "@/components/product/ExpandedAlternatives";
import ComparisonContext from "@/components/product/ComparisonContext";
import AskAIBlock from "@/components/product/AskAIBlock";
import AISummaryBlock from "@/components/product/AISummaryBlock";
import ViewTracker from "@/components/product/ViewTracker";
import WhatsAppCTA from "@/components/home/WhatsAppCTA";
import { analyzeCrossSource, buildCrossSourceOffer } from "@/lib/source/cross-source";
import { countDistinctStores } from "@/lib/source/normalize";
import { getCanonicalComparison, getBestChoice } from "@/lib/catalog/smart-comparison";
import { buildMetadata, productSchema, breadcrumbSchema, generateProductMeta } from "@/lib/seo/metadata";
import { findComparisonsForProduct } from "@/lib/seo/comparisons";
import { formatPrice } from "@/lib/utils";
import {
  getProductBySlug,
  getSimilarProducts,
  getAlternatives,
  getPriceHistory,
} from "@/lib/db/queries";
import { getConsolidatedRating } from "@/lib/reviews/consolidated";
import { getReviewAggregate } from "@/lib/reviews/aggregate";
import ReviewSummary from "@/components/product/ReviewSummary";
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
  const bestOffer = allOffers.length > 0
    ? allOffers.reduce((a, b) => a.currentPrice <= b.currentPrice ? a : b)
    : null;
  const discount = bestOffer?.originalPrice && bestOffer.originalPrice > bestOffer.currentPrice
    ? Math.round((1 - bestOffer.currentPrice / bestOffer.originalPrice) * 100)
    : null;

  return generateProductMeta(
    {
      name: product.name,
      brand: product.brand?.name,
      description: product.description,
      slug,
      imageUrl: product.imageUrl,
    },
    bestOffer ? { price: bestOffer.currentPrice, originalPrice: bestOffer.originalPrice, discount } : null
  );
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

  // Consolidated rating + review aggregate
  const consolidatedRating = await getConsolidatedRating(product.id);
  const reviewAggregate = await getReviewAggregate(product.id).catch(() => null);

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

  // Count distinct commercial sources (canonical, no duplicates, no internal)
  const distinctSources = new Set(product.listings.map((l) => l.source.slug));
  const storesCount = countDistinctStores(product.listings.map((l: any) => l.source.slug));

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
  const specs = product.specsJson as Record<string, unknown> | null;

  // AI-generated FAQs (for FAQ schema → Google rich results)
  const aiFaqs = (specs?.aiFaqs as Array<{ question: string; answer: string }>) || null;

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
    <div className="max-w-7xl mx-auto px-4 py-4 lg:py-6 pb-24 lg:pb-6 overflow-x-hidden">
      {/* View tracker — stores recently viewed + CRM event */}
      <ViewTracker slug={product.slug} productId={product.id} />

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
              // AI-generated FAQs (enriched by daily cron)
              ...(aiFaqs || []).map(faq => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: { "@type": "Answer", text: faq.answer },
              })),
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

      {/* ═══ Mobile Product Hero ═══ */}
      {/* Compact hero visible only on mobile — price + CTA above the fold */}
      <div className="lg:hidden mb-4 space-y-3">
        <div className="flex gap-3">
          {/* Compact image */}
          <div className="w-[104px] h-[104px] flex-shrink-0 rounded-xl bg-white border border-surface-200 overflow-hidden relative shadow-sm">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain p-2"
                sizes="104px"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-surface-300" />
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            {product.brand && (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {product.brand.name}
              </span>
            )}
            <h1 className="text-base font-bold font-display text-text-primary leading-tight line-clamp-2">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {lastSeenLabel && (
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <Clock className="h-2.5 w-2.5" /> {lastSeenLabel}
                </span>
              )}
              {discount && discount >= 20 && (
                <span className="badge-lowest text-[10px]">Preco em queda</span>
              )}
            </div>
            <LiveViewers popularityScore={product.popularityScore} />
          </div>
        </div>

        {/* Price + CTA card — immediate conversion area */}
        {bestOffer && (
          <div className="rounded-xl border border-accent-green/25 bg-gradient-to-r from-green-50/60 to-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs text-text-muted line-through">
                      {formatPrice(bestOffer.originalPrice)}
                    </span>
                    {discount && (
                      <span className="text-[10px] font-bold text-white bg-accent-red px-1.5 py-0.5 rounded">
                        -{discount}%
                      </span>
                    )}
                  </div>
                )}
                <p className="text-2xl font-bold font-display text-text-primary">
                  {formatPrice(bestPrice)}
                </p>
                {showInstallment && (
                  <p className="text-[10px] text-text-muted">
                    ou {installmentCount}x de {formatPrice(installmentValue)}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-text-muted">em {bestOffer.sourceName}</span>
                  {bestOffer.isFreeShipping && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent-green">
                      <Package className="w-2.5 h-2.5" /> Frete gratis
                    </span>
                  )}
                </div>
                {/* Price context badges */}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {isNearAllTimeLow && (
                    <span className="text-[9px] font-semibold text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded-full">
                      Menor preco historico
                    </span>
                  )}
                  {priceBelowAvg30d && priceBelowAvg30d >= 3 && (
                    <span className="text-[9px] font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full">
                      {priceBelowAvg30d}% abaixo da media
                    </span>
                  )}
                </div>
              </div>

              <a
                href={`/api/clickout/${bestOffer.id}?page=product&product=${slug}&origin=mobile_hero`}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-lg ${
                  bestOffer.offerScore >= 80 || (discount && discount >= 30)
                    ? "bg-gradient-to-r from-accent-green to-green-600 shadow-green-200"
                    : "bg-accent-green hover:bg-green-600"
                }`}
              >
                {(bestOffer.offerScore >= 80 || (discount && discount >= 30)) && <Zap className="w-4 h-4" />}
                Comprar
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-[10px] text-text-muted text-center mt-2 flex items-center justify-center gap-1">
              <Shield className="w-2.5 h-2.5 text-accent-green" />
              Compra segura via {bestOffer.sourceName}
            </p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left column: Image + contextual nav — pushed below right column on mobile */}
        <div className="lg:col-span-1 space-y-4 order-2 lg:order-none">
          {/* Product image — hidden on mobile (shown in mobile hero) */}
          <div className="hidden lg:flex card aspect-square relative items-center justify-center p-8 overflow-hidden image-container">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain drop-shadow-sm p-4"
                sizes="33vw"
                priority
              />
            ) : (
              <ShoppingCart className="h-24 w-24 text-surface-300" />
            )}
          </div>

          {/* Contextual navigation */}
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
                {Object.entries(specs).filter(([k]) => k !== 'aiFaqs' && k !== 'aiFaqsGeneratedAt').map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm gap-2">
                    <span className="text-text-muted flex-shrink-0">{key}</span>
                    <span className="text-text-secondary font-medium text-right">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consolidated rating */}
          {consolidatedRating && (
            <ConsolidatedRatingComponent rating={consolidatedRating} />
          )}

          {/* Review summary — enriched aggregate with themes */}
          {reviewAggregate && (
            <ReviewSummary aggregate={reviewAggregate} />
          )}

          {/* About this product */}
          {product.description && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Sobre este produto</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>

        {/* Right column: Info + Offers + Chart — shows first on mobile */}
        <div className="lg:col-span-2 space-y-3 lg:space-y-6 order-1 lg:order-none">
          {/* Breadcrumbs — hidden on mobile (top breadcrumb already visible) */}
          <div className="hidden lg:block">
            <Breadcrumbs items={[
              ...(product.category ? [{ label: product.category.name, href: `/categoria/${product.category.slug}` }] : []),
              { label: product.name },
            ]} />
          </div>

          {/* Product header — hidden on mobile (shown in mobile hero) */}
          <div className="hidden lg:block">
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
            <LiveViewers popularityScore={product.popularityScore} />
          </div>

          {/* Hero Verdict — primary decision signal */}
          {buySignal && bestOffer && (
            <HeroVerdict
              buySignal={buySignal}
              price={bestPrice}
              sourceName={bestOffer.sourceName}
              offerId={bestOffer.id}
              discount={discount}
              isNearAllTimeLow={isNearAllTimeLow}
              priceBelowAvg30d={priceBelowAvg30d}
              productSlug={product.slug}
            />
          )}

          {/* Use case + caveat — hidden on mobile to keep flow lean */}
          <div className="hidden lg:block space-y-6">
            <UseCaseRecommendation
              productName={product.name}
              productTitle={product.listings[0]?.rawTitle || product.name}
              categorySlug={product.category?.slug}
              specsJson={specs}
            />
            <ProductCaveat
              buySignal={buySignal}
              trend={priceStats?.trend}
              cheaperAlternative={
                alternatives.length > 0 && alternatives[0].bestOffer?.price < bestPrice * 0.85
                  ? { name: alternatives[0].name, price: alternatives[0].bestOffer.price, slug: alternatives[0].slug }
                  : null
              }
              reviewConfidence={consolidatedRating?.confidence ?? null}
            />
          </div>

          {/* Price drop alert — returning visitor notification */}
          {bestOffer && (
            <PriceDropAlert
              productSlug={slug}
              productName={product.name}
              currentPrice={bestPrice}
            />
          )}

          {/* Category insights badges — desktop only */}
          <div className="hidden lg:block">
            {categoryInsight && categoryInsight.badges.length > 0 && (
              <CategoryInsightsComponent insight={categoryInsight} />
            )}
          </div>

          {/* Price trend indicator — desktop only (hero has price context) */}
          <div className="hidden lg:block">
            {priceStats && (
              <PriceTrend trend={priceStats.trend} currentPrice={priceStats.current} avgPrice={priceStats.avg30d} />
            )}
          </div>

          {/* Mobile compact decision — replaces 4 blocks on mobile */}
          {bestOffer && (
            <MobileDecisionCompact
              buySignal={buySignal}
              offersCount={allOffers.length}
              storesCount={storesCount}
              discount={discount}
              isFreeShipping={bestOffer.isFreeShipping}
              sourceSlug={bestOffer.sourceSlug}
              offerScore={bestOffer.offerScore}
            >
              {/* Full analysis blocks — shown inside expandable on mobile */}
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
              <SmartDecisionBlock
                productName={product.name}
                currentPrice={bestPrice}
                originalPrice={bestOffer.originalPrice ?? undefined}
                avg30d={priceStats?.avg30d}
                allTimeMin={priceStats?.allTimeMin}
                offersCount={allOffers.length}
                storesCount={storesCount}
                isFreeShipping={bestOffer.isFreeShipping}
                offerScore={bestOffer.offerScore}
                trend={priceStats?.trend}
                buySignal={buySignal}
              />
              {priceStats && (
                <OpportunityScore
                  priceStats={priceStats}
                  offerScore={bestOffer.offerScore}
                  discount={discount}
                  isFreeShipping={bestOffer.isFreeShipping}
                  offersCount={allOffers.length}
                  sourceSlug={bestOffer.sourceSlug}
                />
              )}
            </MobileDecisionCompact>
          )}

          {/* Desktop decision blocks — hidden on mobile */}
          <div className="hidden lg:block space-y-6">
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
            {bestOffer && (
              <SmartDecisionBlock
                productName={product.name}
                currentPrice={bestPrice}
                originalPrice={bestOffer.originalPrice ?? undefined}
                avg30d={priceStats?.avg30d}
                allTimeMin={priceStats?.allTimeMin}
                offersCount={allOffers.length}
                storesCount={storesCount}
                isFreeShipping={bestOffer.isFreeShipping}
                offerScore={bestOffer.offerScore}
                trend={priceStats?.trend}
                buySignal={buySignal}
              />
            )}
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
          </div>

          {/* Better Alternative Hint */}
          {bestOffer && alternatives.length > 0 && (
            <BetterAlternativeHint
              alternatives={alternatives}
              currentPrice={bestOffer.price}
              currentScore={bestOffer.offerScore}
            />
          )}

          {/* Best price highlight card — hidden on mobile (hero already shows price + CTA) */}
          <div className="hidden lg:block">
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
                <UrgencySignals
                  priceDropPercent={discount ?? undefined}
                  isAllTimeLow={priceStats ? bestPrice <= priceStats.allTimeMin : undefined}
                  offerScore={bestOffer.offerScore}
                  daysAtCurrentPrice={undefined}
                />
              </div>
            )}
          </div>

          {/* Inline alert prompt — hidden on mobile (bell in sticky bar) */}
          <div className="hidden lg:block">
            {product.listings[0] && (
              <InlineAlertPrompt
                listingId={product.listings[0].id}
                currentPrice={bestPrice}
                productName={product.name}
              />
            )}
          </div>

          {/* Commercial CTA — hidden on mobile (hero + sticky bar cover CTA) */}
          <div className="hidden lg:block">
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
          </div>

          {/* Price Alert — moved up near purchase decision area */}
          {bestOffer && product.listings[0] && (
            <div id="price-alert">
              <PriceAlertForm
                listingId={product.listings[0].id}
                currentPrice={bestPrice}
                productName={product.name}
              />
            </div>
          )}

          {/* WhatsApp group CTA — hidden on mobile to reduce clutter */}
          <div className="hidden lg:block">
            <WhatsAppCTA variant="inline" />
          </div>

          {/* Trust signals + Why highlighted — hidden on mobile */}
          <div className="hidden lg:block space-y-6">
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
            {bestOffer && (
              <WhyHighlighted
                offerScore={bestOffer.offerScore}
                price={bestOffer.price}
                avgPrice={priceStats?.avg30d}
                rating={bestOffer.rating}
                isFreeShipping={bestOffer.isFreeShipping}
              />
            )}
          </div>

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

          {/* Comparison context — structured vs best alternative */}
          {alternatives.length > 0 && product.category?.slug && bestOffer && (
            <ComparisonContext
              product={{
                name: product.name,
                title: product.listings[0]?.rawTitle || product.name,
                price: bestPrice,
                discount: discount ?? undefined,
                isFreeShipping: bestOffer.isFreeShipping,
              }}
              alternative={{
                name: alternatives[0].name,
                title: alternatives[0].name,
                price: alternatives[0].bestOffer?.price || 0,
                slug: alternatives[0].slug,
                discount: alternatives[0].bestOffer?.discount ?? undefined,
                isFreeShipping: alternatives[0].bestOffer?.isFreeShipping,
              }}
              categorySlug={product.category.slug}
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
                      className={`card p-3 lg:p-4 ${
                        i === 0 ? "border-accent-blue/30 bg-accent-blue/5" : ""
                      }`}
                    >
                      {/* Top row: Rank + Source + Price */}
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div
                          className={`flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-full text-xs lg:text-sm font-bold flex-shrink-0 ${
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
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          {offer.originalPrice && offer.originalPrice > offer.price && (
                            <p className="text-[10px] lg:text-xs text-text-muted line-through">
                              {formatPrice(offer.originalPrice)}
                            </p>
                          )}
                          <p
                            className={`text-base lg:text-lg font-bold font-display ${
                              i === 0 ? "text-accent-blue" : "text-text-primary"
                            }`}
                          >
                            {formatPrice(offer.price)}
                          </p>
                          {offerDiscount && (
                            <p className="text-[10px] text-accent-green font-medium">-{offerDiscount}%</p>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: badges + CTA */}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {offer.rating != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-accent-orange">
                              <Star className="h-2.5 w-2.5 fill-current" /> {offer.rating.toFixed(1)}
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
                          {offer.price > 100 && (
                            <span className="text-[10px] text-text-muted">
                              12x {formatPrice(offer.price / 12)}
                            </span>
                          )}
                        </div>
                        {/* CTA */}
                        <a
                          href={`/api/clickout/${offer.id}?page=product`}
                          target="_blank"
                          rel="noopener noreferrer nofollow sponsored"
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                            i === 0 ? "btn-primary" : "btn-secondary"
                          }`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Ver
                        </a>
                      </div>
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

          {/* Share section — hidden on mobile (sticky bar has share) */}
          <div className="hidden sm:block card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-text-muted" /> Compartilhar
            </h3>
            <ShareButtons
              url={productUrl}
              title={product.name}
              price={bestOffer ? formatPrice(bestPrice) : ""}
            />
          </div>

          {/* AI Summary — on-demand product analysis */}
          <AISummaryBlock productSlug={slug} />

          {/* Ask AI block — link to assistant with product context */}
          <AskAIBlock productName={product.name} productSlug={slug} />

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

      {/* Amazon alternative removed — low conversion, cluttered UX */}

      {/* Continue Exploring */}
      <ContinueExploring
        productName={product.name}
        categorySlug={product.category?.slug}
        categoryName={product.category?.name}
      />

      {/* Expanded alternatives — external marketplace options (FF_EXPANDED_SEARCH) */}
      {getFlag('expandedSearch') && (
        <ExpandedAlternatives
          productName={product.name}
          productSlug={slug}
          categorySlug={product.category?.slug}
        />
      )}

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

      {/* Cross-cluster navigation */}
      {product.category?.slug && (
        <CrossClusterLinks categorySlug={product.category.slug} />
      )}

      {/* Similar products cross-sell */}
      <SimilarProducts
        productId={product.id}
        categorySlug={product.category?.slug}
        brandId={product.brandId ?? undefined}
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
