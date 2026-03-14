import { notFound } from "next/navigation";
import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp, Minus, Clock, ArrowLeft } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import PriceAlertForm from "@/components/product/PriceAlertForm";
import PriceChart from "@/components/charts/PriceChartLazy";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { formatPrice } from "@/lib/utils";
import { getProductBySlug, getPriceHistory } from "@/lib/db/queries";
import type { PriceHistoryPoint, PriceStats } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return buildMetadata({ title: "Produto nao encontrado", noIndex: true });

  return buildMetadata({
    title: `Preco de ${product.name} — Historico e Melhor Momento para Comprar`,
    description: `Acompanhe o historico de precos de ${product.name}. Veja como o preco variou nos ultimos 90 dias e descubra o melhor momento para comprar.`,
    path: `/preco/${slug}`,
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
    min30d: min(prices30d), max30d: max(prices30d), avg30d: Math.round(avg30 * 100) / 100,
    min90d: min(prices90d), max90d: max(prices90d), avg90d: Math.round(avg(prices90d) * 100) / 100,
    allTimeMin: min(prices), trend,
  };
}

export default async function PrecoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const allOffers = product.listings.flatMap((l) =>
    l.offers.map((o) => ({ ...o, sourceName: l.source.name, sourceSlug: l.source.slug }))
  ).sort((a, b) => a.currentPrice - b.currentPrice);

  const bestOffer = allOffers[0] || null;
  const bestPrice = bestOffer?.currentPrice ?? 0;

  let priceHistory: PriceHistoryPoint[] = [];
  let priceStats: PriceStats | null = null;

  if (bestOffer) {
    const snapshots = await getPriceHistory(bestOffer.id, 90);
    const hasTimeSpread = snapshots.length >= 2 &&
      (snapshots[snapshots.length - 1].capturedAt.getTime() - snapshots[0].capturedAt.getTime()) > 24 * 60 * 60 * 1000;
    if (hasTimeSpread) {
      priceHistory = snapshots.map((s) => ({
        date: s.capturedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        price: s.price,
        originalPrice: s.originalPrice ?? undefined,
      }));
      priceStats = computePriceStats(snapshots, bestOffer.currentPrice);
    }
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(product.category ? [{ label: product.category.name, href: `/categoria/${product.category.slug}` }] : []),
    { label: product.name, href: `/produto/${slug}` },
    { label: "Historico de Preco" },
  ];

  const TrendIcon = priceStats?.trend === "down" ? TrendingDown : priceStats?.trend === "up" ? TrendingUp : Minus;
  const trendColor = priceStats?.trend === "down" ? "text-accent-green" : priceStats?.trend === "up" ? "text-accent-red" : "text-text-muted";
  const trendLabel = priceStats?.trend === "down" ? "Em queda" : priceStats?.trend === "up" ? "Em alta" : "Estavel";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Breadcrumb items={breadcrumbItems} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbSchema([
          { name: "Home", url: "/" },
          ...(product.category ? [{ name: product.category.name, url: `/categoria/${product.category.slug}` }] : []),
          { name: product.name, url: `/produto/${slug}` },
          { name: "Historico de Preco", url: `/preco/${slug}` },
        ])),
      }} />

      <div className="mt-6 mb-4">
        <Link href={`/produto/${slug}`} className="text-sm text-accent-blue hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o produto
        </Link>
      </div>

      <h1 className="font-display font-bold text-2xl md:text-3xl text-text-primary mb-2">
        Historico de Preco: {product.name}
      </h1>
      {product.brand && (
        <p className="text-sm text-text-muted mb-6">{product.brand.name}</p>
      )}

      {/* Price stats cards */}
      {priceStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="card p-4">
            <p className="text-xs text-text-muted mb-1">Preco Atual</p>
            <p className="font-display font-bold text-xl text-accent-blue">{formatPrice(priceStats.current)}</p>
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3.5 h-3.5" /> {trendLabel}
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-text-muted mb-1">Menor 30 dias</p>
            <p className="font-display font-bold text-xl text-accent-green">{formatPrice(priceStats.min30d)}</p>
            {priceStats.current <= priceStats.min30d * 1.02 && (
              <p className="text-xs text-accent-green font-medium mt-1">Proximo do menor!</p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-xs text-text-muted mb-1">Media 30 dias</p>
            <p className="font-display font-bold text-xl text-text-primary">{formatPrice(priceStats.avg30d)}</p>
            {priceStats.current < priceStats.avg30d && (
              <p className="text-xs text-accent-green font-medium mt-1">Abaixo da media</p>
            )}
          </div>
          <div className="card p-4">
            <p className="text-xs text-text-muted mb-1">Maior 30 dias</p>
            <p className="font-display font-bold text-xl text-accent-red">{formatPrice(priceStats.max30d)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-text-muted" /> Evolucao do Preco (90 dias)
        </h2>
        {priceHistory.length >= 2 && priceStats ? (
          <PriceChart data={priceHistory} stats={priceStats} />
        ) : (
          <div className="flex items-center gap-3 justify-center py-10 text-text-muted">
            <Clock className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Monitorando precos...</p>
              <p className="text-xs mt-1">O historico estara disponivel em breve.</p>
            </div>
          </div>
        )}
      </div>

      {/* Best moment to buy */}
      {priceStats && (
        <div className="card p-6 mb-8 section-highlight rounded-xl">
          <h2 className="text-lg font-bold font-display text-text-primary mb-3">
            Melhor momento para comprar?
          </h2>
          {priceStats.trend === "down" ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-green">Bom momento para comprar!</p>
                <p className="text-sm text-text-muted mt-1">
                  O preco esta em tendencia de queda e abaixo da media dos ultimos 30 dias.
                  Este pode ser um bom momento para aproveitar.
                </p>
              </div>
            </div>
          ) : priceStats.trend === "up" ? (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-accent-orange" />
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-orange">Preco em alta — considere esperar</p>
                <p className="text-sm text-text-muted mt-1">
                  O preco esta acima da media recente. Pode valer a pena ativar um alerta
                  e esperar uma queda.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
                <Minus className="w-5 h-5 text-text-muted" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Preco estavel</p>
                <p className="text-sm text-text-muted mt-1">
                  O preco tem se mantido estavel. Se precisar do produto, pode ser um momento ok.
                  Ative um alerta para ser avisado de quedas.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price comparison by source */}
      {allOffers.length > 1 && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-bold font-display text-text-primary mb-4">
            Preco por Loja
          </h2>
          <div className="space-y-3">
            {allOffers.map((offer, i) => (
              <div key={offer.id} className={`flex items-center justify-between py-2 ${i > 0 ? "border-t border-surface-100" : ""}`}>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{offer.sourceName}</p>
                  {offer.isFreeShipping && <span className="text-[10px] text-accent-purple font-medium">Frete gratis</span>}
                </div>
                <div className="text-right">
                  <p className={`font-display font-bold ${i === 0 ? "text-accent-blue" : "text-text-primary"}`}>
                    {formatPrice(offer.currentPrice)}
                  </p>
                  {i > 0 && (
                    <p className="text-xs text-text-muted">
                      +{formatPrice(offer.currentPrice - allOffers[0].currentPrice)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price alert */}
      {bestOffer && product.listings[0] && (
        <div className="mb-8">
          <PriceAlertForm
            listingId={product.listings[0].id}
            currentPrice={bestPrice}
            productName={product.name}
          />
        </div>
      )}

      {/* FAQ */}
      <div className="card p-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-4">Perguntas Frequentes</h2>
        <div className="space-y-3">
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-text-primary py-2 hover:text-accent-blue">
              O preco mostrado e confiavel?
            </summary>
            <p className="text-sm text-text-muted pb-2 pl-4">
              Sim. Os precos sao coletados diretamente das APIs e paginas dos marketplaces parceiros.
              No entanto, eles podem variar entre o momento da consulta e a compra.
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-text-primary py-2 hover:text-accent-blue">
              Como funciona o alerta de preco?
            </summary>
            <p className="text-sm text-text-muted pb-2 pl-4">
              Voce define um preco alvo e seu email. Quando o preco atingir esse valor, enviamos
              um email avisando. Simples e sem spam.
            </p>
          </details>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold text-text-primary py-2 hover:text-accent-blue">
              A tendencia indica que o preco vai cair?
            </summary>
            <p className="text-sm text-text-muted pb-2 pl-4">
              A tendencia mostra o comportamento recente, nao e uma previsao. Um preco em queda
              pode estabilizar ou subir a qualquer momento.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
