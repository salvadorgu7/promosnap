import {
  Brain,
  TrendingUp,
  BarChart3,
  Zap,
  Shield,
  DollarSign,
  Package,
  ArrowRight,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import { scoreProduto, decideEditorialBlock } from "@/lib/decision/engine";
import { getAllSourceProfiles } from "@/lib/source/routing";
import type { ProductScoringInput } from "@/lib/decision/types";

export const dynamic = "force-dynamic";

export default async function AdminDecisoesPage() {
  // Fetch top products with offers for live scoring
  let topProducts: ProductScoringInput[] = [];
  try {
    const raw: {
      id: string;
      name: string;
      slug: string;
      popularityScore: number;
      offerScore: number;
      currentPrice: number;
      originalPrice: number | null;
      sourceSlug: string;
      isFreeShipping: boolean;
      updatedAt: Date;
      clickout_count: number;
      favorites_count: number;
      alerts_count: number;
    }[] = await prisma.$queryRaw`
      SELECT
        p.id, p.name, p.slug, p."popularityScore",
        o."offerScore", o."currentPrice", o."originalPrice",
        s.slug AS "sourceSlug",
        o."isFreeShipping",
        o."updatedAt",
        COALESCE(click_counts.cnt, 0)::int AS clickout_count,
        COALESCE(fav_counts.cnt, 0)::int AS favorites_count,
        COALESCE(alert_counts.cnt, 0)::int AS alerts_count
      FROM products p
      JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
      JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
      JOIN sources s ON l."sourceId" = s.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt FROM clickouts c WHERE c."offerId" = o.id
      ) click_counts ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt FROM favorites f WHERE f."productId" = p.id
      ) fav_counts ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt FROM price_alerts pa WHERE pa."productId" = p.id
      ) alert_counts ON true
      WHERE p.status = 'ACTIVE'
      ORDER BY o."offerScore" DESC
      LIMIT 30
    `;

    topProducts = raw.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      offerScore: r.offerScore ?? 0,
      currentPrice: r.currentPrice,
      originalPrice: r.originalPrice ?? undefined,
      sourceSlug: r.sourceSlug,
      clickouts: r.clickout_count,
      favoritesCount: r.favorites_count,
      alertsCount: r.alerts_count,
      updatedAt: r.updatedAt,
      isFreeShipping: r.isFreeShipping,
      popularityScore: r.popularityScore,
    }));
  } catch {}

  // Score all products
  const scoredProducts = topProducts
    .map((p) => ({
      product: p,
      decision: scoreProduto(p),
    }))
    .sort((a, b) => b.decision.totalScore - a.decision.totalScore)
    .slice(0, 10);

  // Editorial block decision
  let editorialDecision = decideEditorialBlock({
    hotDealsCount: 0,
    lowestPricesCount: 0,
    bestSellersCount: 0,
    trendingCount: 0,
    couponsCount: 0,
    dealOfDayAvailable: false,
  });
  try {
    const [hotCount, lowestCount, bestCount, couponCount] = await Promise.all([
      prisma.offer.count({ where: { isActive: true, offerScore: { gte: 70 } } }),
      prisma.offer.count({ where: { isActive: true, originalPrice: { not: null } } }),
      prisma.listing.count({ where: { status: "ACTIVE", salesCountEstimate: { gt: 100 } } }),
      prisma.coupon.count({ where: { status: "ACTIVE" } }),
    ]);

    editorialDecision = decideEditorialBlock({
      hotDealsCount: hotCount,
      lowestPricesCount: lowestCount,
      bestSellersCount: bestCount,
      trendingCount: Math.min(hotCount, 5),
      couponsCount: couponCount,
      dealOfDayAvailable: hotCount > 0,
    });
  } catch {}

  // Source quality rankings
  const sourceProfiles = getAllSourceProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Brain className="h-6 w-6 text-accent-blue" />
          Motor de Decisoes
        </h1>
        <p className="text-sm text-text-muted">
          Score composto, roteamento de fontes e blocos editoriais — calculos ao vivo
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Produtos Avaliados
            </span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {scoredProducts.length}
          </p>
          <p className="text-xs text-text-muted mt-1">top 10 por score composto</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Blocos Editoriais
            </span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {editorialDecision.result.length}
          </p>
          <p className="text-xs text-text-muted mt-1">recomendados para homepage</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Fontes Mapeadas
            </span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {sourceProfiles.length}
          </p>
          <p className="text-xs text-text-muted mt-1">com perfil de qualidade</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-red" />
            <span className="text-xs text-text-muted uppercase tracking-wider">
              Score Medio
            </span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {scoredProducts.length > 0
              ? (
                  (scoredProducts.reduce((s, p) => s + p.decision.totalScore, 0) /
                    scoredProducts.length) *
                  100
                ).toFixed(1)
              : "0"}
          </p>
          <p className="text-xs text-text-muted mt-1">dos top 10 produtos</p>
        </div>
      </div>

      {/* Top 10 scored products */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-blue" />
          Top 10 — Score Composto
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Ranking ao vivo com breakdown de fatores
        </p>
        {scoredProducts.length > 0 ? (
          <div className="space-y-3">
            {scoredProducts.map((item, idx) => (
              <div key={item.product.id} className="p-4 rounded-lg bg-surface-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-accent-blue rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-text-primary truncate">
                        {item.product.name}
                      </p>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 ml-7">
                      {item.decision.reason}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-lg font-bold font-display text-accent-blue">
                      {(item.decision.totalScore * 100).toFixed(1)}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase">score</p>
                  </div>
                </div>
                {/* Factor bars */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 ml-7">
                  {item.decision.factors.map((f) => (
                    <div key={f.name} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-text-muted truncate">{f.name}</span>
                        <span className="text-text-secondary font-medium ml-1">
                          {(f.contribution * 100).toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green"
                          style={{ width: `${Math.min(100, f.value * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Nenhum produto com ofertas ativas para avaliar.
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editorial blocks decision */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-orange" />
            Blocos Editoriais
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Decisao automatica de quais blocos exibir na homepage
          </p>
          {editorialDecision.result.length > 0 ? (
            <div className="space-y-2">
              {editorialDecision.result.map((block) => (
                <div
                  key={block.type}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-white bg-accent-orange rounded-full w-5 h-5 flex items-center justify-center">
                      {block.priority}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {formatBlockType(block.type)}
                      </p>
                      <p className="text-xs text-text-muted">{block.reason}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              Nenhum bloco editorial recomendado.
            </p>
          )}
          {editorialDecision.factors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <p className="text-xs text-text-muted mb-2">Fatores da decisao</p>
              <div className="space-y-1.5">
                {editorialDecision.factors.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted w-24 truncate">{f.name}</span>
                    <div className="flex-1 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-orange"
                        style={{ width: `${Math.min(100, f.value * 100)}%` }}
                      />
                    </div>
                    <span className="text-text-secondary font-medium w-8 text-right">
                      {(f.value * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Source quality rankings */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-green" />
            Ranking de Fontes
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Qualidade, comissao e perfil de cada marketplace
          </p>
          <div className="space-y-2">
            {sourceProfiles
              .sort((a, b) => b.quality - a.quality)
              .map((profile, idx) => (
                <div
                  key={profile.slug}
                  className="p-3 rounded-lg bg-surface-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-accent-green rounded-full w-5 h-5 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-text-primary">
                        {profile.name}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        profile.trustLevel === "high"
                          ? "bg-green-50 text-accent-green"
                          : profile.trustLevel === "medium"
                          ? "bg-orange-50 text-accent-orange"
                          : "bg-red-50 text-accent-red"
                      }`}
                    >
                      {profile.trustLevel}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-text-muted">Qualidade</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-full h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent-green"
                            style={{ width: `${profile.quality * 100}%` }}
                          />
                        </div>
                        <span className="font-medium text-text-primary">
                          {(profile.quality * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-text-muted">Comissao</p>
                      <p className="font-medium text-text-primary mt-0.5">
                        {(profile.revenueRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-text-muted">Entrega</p>
                      <p className="font-medium text-text-primary mt-0.5">
                        ~{profile.avgDeliveryDays ?? "?"} dias
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Decision factors weight reference */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-blue" />
          Pesos dos Fatores (Balanced)
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Configuracao de pesos do score composto no modo balanced
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: "Offer Score", weight: 0.25, color: "bg-accent-blue" },
            { name: "Revenue", weight: 0.15, color: "bg-accent-green" },
            { name: "CTR Estimate", weight: 0.15, color: "bg-accent-orange" },
            { name: "Favorites", weight: 0.10, color: "bg-accent-red" },
            { name: "Alerts", weight: 0.05, color: "bg-purple-400" },
            { name: "Source Quality", weight: 0.10, color: "bg-teal-400" },
            { name: "Freshness", weight: 0.10, color: "bg-yellow-400" },
            { name: "Match Confidence", weight: 0.10, color: "bg-pink-400" },
          ].map((factor) => (
            <div key={factor.name} className="p-3 rounded-lg bg-surface-50">
              <p className="text-xs text-text-muted mb-1">{factor.name}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${factor.color}`}
                    style={{ width: `${factor.weight * 100 * 4}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-text-primary">
                  {(factor.weight * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatBlockType(type: string): string {
  const map: Record<string, string> = {
    hot_deals: "Ofertas Quentes",
    lowest_prices: "Menores Precos",
    best_sellers: "Mais Vendidos",
    trending: "Em Tendencia",
    deal_of_day: "Oferta do Dia",
    coupon_picks: "Selecao com Cupom",
  };
  return map[type] ?? type;
}
