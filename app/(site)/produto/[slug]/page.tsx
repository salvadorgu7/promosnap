import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ShoppingCart, BarChart3, Store, Shield, TrendingDown, TrendingUp, Minus, Award, Tag } from "lucide-react";
import PriceChart from "@/components/charts/PriceChart";
import Breadcrumb from "@/components/ui/Breadcrumb";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata, productSchema, breadcrumbSchema } from "@/lib/seo/metadata";
import { formatPrice } from "@/lib/utils";
import { getListingByExternalId, getHotOffers } from "@/lib/db/queries";
import type { PriceHistoryPoint, PriceStats, ProductCard } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingByExternalId(slug).catch(() => null);
  const name = listing?.rawTitle || slug.replace(/-/g, " ");
  return buildMetadata({ title: `${name} - Melhor Preço`, path: `/produto/${slug}` });
}

function computeStats(snapshots: { price: number; originalPrice: number | null; capturedAt: Date }[]): PriceStats | null {
  if (snapshots.length === 0) return null;
  const now = new Date();
  const d30 = new Date(now); d30.setDate(now.getDate() - 30);
  const d90 = new Date(now); d90.setDate(now.getDate() - 90);

  const snaps30 = snapshots.filter(s => s.capturedAt >= d30);
  const snaps90 = snapshots.filter(s => s.capturedAt >= d90);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const prices = snapshots.map(s => s.price);
  const prices30 = snaps30.length ? snaps30.map(s => s.price) : prices;
  const prices90 = snaps90.length ? snaps90.map(s => s.price) : prices;

  const current = prices[prices.length - 1];
  const allTimeMin = Math.min(...prices);
  const avg30 = avg(prices30);

  return {
    current,
    min30d: Math.min(...prices30),
    max30d: Math.max(...prices30),
    avg30d: Math.round(avg30),
    min90d: Math.min(...prices90),
    max90d: Math.max(...prices90),
    avg90d: Math.round(avg(prices90)),
    allTimeMin,
    trend: current < avg30 * 0.97 ? 'down' : current > avg30 * 1.03 ? 'up' : 'stable',
  };
}

const SOURCE_ICONS: Record<string, string> = {
  "amazon-br": "🟠",
  "mercadolivre": "🟡",
  "shopee": "🟤",
  "shein": "🟣",
};

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingByExternalId(slug).catch(() => null);

  if (!listing) notFound();

  const bestOffer = listing.offers[0];
  if (!bestOffer) notFound();

  // Build price history from all snapshots across offers
  const allSnapshots = listing.offers.flatMap(o => o.priceSnapshots);
  allSnapshots.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());

  const priceHistory: PriceHistoryPoint[] = allSnapshots.map(s => ({
    date: s.capturedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    price: s.price,
    originalPrice: s.originalPrice ?? undefined,
  }));

  if (priceHistory.length === 1) {
    priceHistory.unshift({ ...priceHistory[0], date: "Anterior" });
  }

  const stats = computeStats(allSnapshots);
  const discount = bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.currentPrice
    ? Math.round((1 - bestOffer.currentPrice / bestOffer.originalPrice) * 100)
    : 0;

  const TrendIcon = stats?.trend === 'down' ? TrendingDown : stats?.trend === 'up' ? TrendingUp : Minus;
  const trendColor = stats?.trend === 'down' ? 'text-accent-green' : stats?.trend === 'up' ? 'text-accent-red' : 'text-surface-500';
  const trendLabel = stats?.trend === 'down' ? 'Preço em queda' : stats?.trend === 'up' ? 'Preço subindo' : 'Preço estável';

  const fallbackStats: PriceStats = {
    current: bestOffer.currentPrice,
    min30d: bestOffer.currentPrice,
    max30d: bestOffer.originalPrice ?? bestOffer.currentPrice,
    avg30d: bestOffer.currentPrice,
    min90d: bestOffer.currentPrice,
    max90d: bestOffer.originalPrice ?? bestOffer.currentPrice,
    avg90d: bestOffer.currentPrice,
    allTimeMin: bestOffer.currentPrice,
    trend: 'stable',
  };

  // Similar products
  let similarProducts: ProductCard[] = [];
  try {
    similarProducts = await getHotOffers(6);
    // Filter out current product
    similarProducts = similarProducts.filter(p => p.slug !== slug).slice(0, 6);
  } catch {}

  const maxOfferPrice = listing.offers.length > 1
    ? Math.max(...listing.offers.map(o => o.currentPrice))
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: "Ofertas", href: "/ofertas" },
        { label: listing.rawTitle },
      ]} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema({
        name: listing.rawTitle,
        description: listing.rawDescription || undefined,
        brand: listing.rawBrand || undefined,
        offers: listing.offers.map(o => ({
          price: o.currentPrice,
          url: o.affiliateUrl || listing.productUrl,
          seller: listing.source.name,
          availability: "InStock",
        })),
      })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Ofertas", url: "/ofertas" },
        { name: listing.rawTitle, url: `/produto/${slug}` },
      ])) }} />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Image + Stats */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card aspect-square flex items-center justify-center p-8 bg-surface-50 overflow-hidden group">
            {listing.imageUrl ? (
              <img src={listing.imageUrl} alt={listing.rawTitle} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" loading="lazy" />
            ) : (
              <div className="text-center">
                <ShoppingCart className="h-24 w-24 text-surface-300 mx-auto" />
                <p className="text-sm text-surface-400 mt-2">Sem imagem</p>
              </div>
            )}
          </div>

          {stats && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-surface-900 mb-3">Resumo de Preços</h3>
              <div className="space-y-2">
                {[
                  { label: "Mínimo 30 dias", value: formatPrice(stats.min30d) },
                  { label: "Máximo 30 dias", value: formatPrice(stats.max30d) },
                  { label: "Média 30 dias", value: formatPrice(stats.avg30d) },
                  { label: "Mínimo histórico", value: formatPrice(stats.allTimeMin), highlight: true },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-surface-500">{label}</span>
                    <span className={`font-medium ${highlight ? "text-accent-green" : "text-surface-700"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info + Offers + Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {listing.rawBrand && (
                <span className="text-xs font-medium uppercase tracking-wider text-surface-500">{listing.rawBrand}</span>
              )}
              {stats && (
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" /> {trendLabel}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-surface-900 mb-2">{listing.rawTitle}</h1>
            <p className="text-xs text-surface-500">Fonte: {listing.source.name}</p>
          </div>

          {/* Best price CTA */}
          <div id="melhor-preco" className="card p-5 border-accent-blue/20 bg-accent-blue/5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-surface-500 mb-1">Melhor preço encontrado</p>
                {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.currentPrice && (
                  <p className="text-sm text-surface-400 line-through">{formatPrice(bestOffer.originalPrice)}</p>
                )}
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-accent-blue font-display">{formatPrice(bestOffer.currentPrice)}</p>
                  {discount > 0 && (
                    <span className="text-sm font-semibold text-accent-green">-{discount}%</span>
                  )}
                </div>
                {bestOffer.isFreeShipping && (
                  <p className="text-xs text-accent-green mt-1">🚚 Frete grátis</p>
                )}
              </div>
              <a
                href={bestOffer.affiliateUrl || listing.productUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn-primary text-base px-6 py-3"
              >
                <ExternalLink className="h-4 w-4" /> Ver Oferta no {listing.source.name}
              </a>
            </div>
          </div>

          {/* Multiple offers - improved comparator */}
          {listing.offers.length > 1 && (
            <div id="comparar">
              <h2 className="text-lg font-bold font-display text-surface-900 mb-3 flex items-center gap-2">
                <Store className="h-4 w-4 text-surface-500" /> Comparar Ofertas ({listing.offers.length})
              </h2>
              <div className="space-y-2">
                {[...listing.offers].sort((a, b) => a.currentPrice - b.currentPrice).map((offer, i) => {
                  const offerDisc = offer.originalPrice && offer.originalPrice > offer.currentPrice
                    ? Math.round((1 - offer.currentPrice / offer.originalPrice) * 100) : 0;
                  const savings = maxOfferPrice ? maxOfferPrice - offer.currentPrice : 0;
                  const sourceIcon = SOURCE_ICONS[listing.source.slug] || "🏪";
                  return (
                    <div key={offer.id} className={`card flex items-center gap-4 p-4 ${i === 0 ? "border-accent-green/20 bg-accent-green/5" : ""}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${i === 0 ? "bg-accent-green text-white" : "bg-surface-100 text-surface-500"}`}>
                        {i === 0 ? <Award className="w-4 h-4" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                          <span>{sourceIcon}</span> {listing.source.name}
                          {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green font-bold">#1 Melhor Preço</span>}
                        </p>
                        {offer.isFreeShipping && <span className="badge-shipping text-[10px] px-1.5 py-0 mt-0.5 inline-block">Frete grátis</span>}
                      </div>
                      <div className="text-right shrink-0">
                        {offer.originalPrice && <p className="text-xs text-surface-400 line-through">{formatPrice(offer.originalPrice)}</p>}
                        <p className={`text-lg font-bold font-display ${i === 0 ? "text-accent-green" : "text-surface-900"}`}>{formatPrice(offer.currentPrice)}</p>
                        <div className="flex items-center gap-2 justify-end">
                          {offerDisc > 0 && <p className="text-xs text-accent-green">-{offerDisc}%</p>}
                          {savings > 0 && i === 0 && <p className="text-[10px] text-surface-400">Economia: {formatPrice(savings)}</p>}
                        </div>
                      </div>
                      <a
                        href={offer.affiliateUrl || listing.productUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className={i === 0 ? "btn-primary text-sm py-2 shrink-0" : "btn-secondary text-sm py-2 shrink-0"}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Ver
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price history chart */}
          {priceHistory.length >= 2 && (
            <div id="historico">
              <h2 className="text-lg font-bold font-display text-surface-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-surface-500" /> Histórico de Preço
              </h2>
              <PriceChart data={priceHistory} stats={stats ?? fallbackStats} />
            </div>
          )}

          {/* Trust */}
          <div className="card p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent-blue flex-shrink-0" />
            <p className="text-xs text-surface-500 leading-relaxed">
              Os preços são atualizados periodicamente. O PromoSnap não vende produtos — ao clicar em &ldquo;Ver Oferta&rdquo;, você é redirecionado para a loja parceira. Podemos receber comissões por compras via links afiliados.
            </p>
          </div>

          {/* Similar products */}
          {similarProducts.length > 0 && (
            <div>
              <h2 className="text-lg font-bold font-display text-surface-900 mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4 text-surface-500" /> Você também pode gostar
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
                {similarProducts.map((p) => (
                  <div key={p.id} className="w-[200px] md:w-[220px] flex-shrink-0 snap-start">
                    <OfferCard product={p} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-surface-200 shadow-lg p-3 z-40">
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          <div>
            <p className="text-lg font-bold font-display text-surface-900">{formatPrice(bestOffer.currentPrice)}</p>
            {discount > 0 && <span className="text-xs text-accent-green font-semibold">-{discount}%</span>}
          </div>
          <a
            href={bestOffer.affiliateUrl || listing.productUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn-primary text-sm px-5 py-2.5"
          >
            <ExternalLink className="h-4 w-4" /> Ver Oferta
          </a>
        </div>
      </div>
    </div>
  );
}
