import type { ProductCard } from "@/types";
import { Flame, TrendingDown, Trophy, Sparkles, Tag, Star, Search, ArrowRight, Package, Percent, Zap } from "lucide-react";
import nextDynamic from "next/dynamic";
import DailyOpportunities from "@/components/home/DailyOpportunities";
import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import RailSection from "@/components/home/RailSection";
import OfferCard from "@/components/cards/OfferCard";
import CategoryCard from "@/components/cards/CategoryCard";
import TrendingTags from "@/components/home/TrendingTags";
import DealOfTheDay from "@/components/home/DealOfTheDay";
import Newsletter from "@/components/home/Newsletter";
import CategoryRail from "@/components/home/CategoryRail";
import OfferCarousel from "@/components/home/OfferCarousel";
import SocialProof from "@/components/home/SocialProof";
import RadarBanner from "@/components/home/RadarBanner";
import ReturnUserGreeting from "@/components/home/ReturnUserGreeting";
import AmazonPromo from "@/components/home/AmazonPromo";
import FirstSaleBanner from "@/components/home/FirstSaleBanner";
import EmailCapture from "@/components/engagement/EmailCapture";
import StoreTrustBar from "@/components/home/StoreTrustBar";
import WhyPromoSnap from "@/components/home/WhyPromoSnap";

// Lazy-load below-fold client components for faster initial load
const PersonalizedRails = nextDynamic(() => import("@/components/home/PersonalizedRails"));
const SinceLastVisit = nextDynamic(() => import("@/components/home/SinceLastVisit"));
const RecentlyViewedRail = nextDynamic(() => import("@/components/home/RecentlyViewedRail"));
const SmartSuggestions = nextDynamic(() => import("@/components/home/SmartSuggestions"));
const PriceDropRail = nextDynamic(() => import("@/components/home/PriceDropRail"));
const OpportunityRail = nextDynamic(() => import("@/components/home/OpportunityRail"));
const EditorialRail = nextDynamic(() => import("@/components/home/EditorialRail"));
const AIAssistantCTA = nextDynamic(() => import("@/components/home/AIAssistantCTA"));
import { WebsiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
import { getHotOffers, getBestSellers, getLowestPrices, getRecentlyImported, getBestValue, getReadyForCampaign, getCategories, getSiteStats, getActiveCoupons, getProductsByCategory } from "@/lib/db/queries";
import { getSocialRanking } from "@/lib/commerce/social-ranking";
import prisma from "@/lib/db/prisma";
import { formatNumber } from "@/lib/utils";
import Econometro from "@/components/home/Econometro";

// Priority category slugs — controls sort order in the categories grid
const PRIORITY_SLUGS = ["celulares", "notebooks", "esportes"];

const TRENDING_SEARCHES = [
  "iPhone 15", "Galaxy S24", "Air Fryer", "PS5", "Notebook Gamer",
  "Fone Bluetooth", "Smart TV 55", "Aspirador Robo",
];

// ISR: rebuild homepage every 60 seconds (not force-dynamic — huge TTFB improvement)
// Client-side components (DailyOpportunities, PersonalizedRails, SinceLastVisit) still
// fetch fresh data via API, so user sees live content within static shell.
export const revalidate = 60;

// ─── Section Header component ────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  badge,
}: {
  icon: typeof Flame;
  iconColor: string;
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className={`w-8 h-8 rounded-lg ${iconColor.replace("text-", "bg-")}/12 flex items-center justify-center flex-shrink-0 border ${iconColor.replace("text-", "border-")}/15`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-lg text-text-primary">{title}</h2>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-text-muted">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section Separator ───────────────────────────────────────────────────────

function SectionSeparator() {
  return (
    <div className="section-separator max-w-7xl mx-auto px-4 py-2">
      <div className="h-px bg-gradient-to-r from-transparent via-surface-300/60 to-transparent" />
    </div>
  );
}

export default async function HomePage() {
  const [hotOffers, bestSellers, lowestPrices, recentlyImported, bestValue, readyForCampaign, categories, stats, coupons, trendingKeywords] = await Promise.all([
    getHotOffers(16).catch(() => []),
    getBestSellers(16).catch(() => []),
    getLowestPrices(16).catch(() => []),
    getRecentlyImported(16).catch(() => []),
    getBestValue(16).catch(() => []),
    getReadyForCampaign(16).catch(() => []),
    getCategories().catch(() => []),
    getSiteStats().catch(() => ({ listings: 0, activeOffers: 0, sources: 5, clickoutsToday: 0, clickoutsWeek: 0, categories: 0, brands: 0 })),
    getActiveCoupons().catch(() => []),
    prisma.trendingKeyword.findMany({ orderBy: [{ fetchedAt: "desc" }, { position: "asc" }], take: 15 }).catch(() => []),
  ]);

  // Social ranking
  const socialRanking = await getSocialRanking(6).catch(() => ({
    mostClicked: [],
    mostMonitored: [],
    mostPopular: [],
  }));

  // ── Cross-rail deduplication ──────────────────────────────────────────────
  // The same product should NOT appear in multiple rails on the same viewport.
  // Priority order: hotOffers > bestSellers > lowestPrices > bestValue > readyForCampaign > recentlyImported
  const seenIds = new Set<string>();
  function dedup(cards: ProductCard[]): ProductCard[] {
    const result: ProductCard[] = [];
    for (const c of cards) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        result.push(c);
      }
    }
    return result;
  }
  // Apply dedup in priority order (mutates seenIds progressively)
  const dedupedHotOffers = dedup(hotOffers);
  const dedupedBestSellers = dedup(bestSellers);
  const dedupedLowestPrices = dedup(lowestPrices);
  const dedupedBestValue = dedup(bestValue);
  const dedupedReadyForCampaign = dedup(readyForCampaign);
  const dedupedRecentlyImported = dedup(recentlyImported);

  // Best deal of the day
  const dealOfTheDay = dedupedHotOffers.length > 0 ? dedupedHotOffers[0] : null;

  // Sort categories so priority ones come first; hide empty ones
  const nonEmptyCategories = categories.filter((c: any) => (c._count?.products ?? 0) > 0)
  const sortedCategories = [
    ...nonEmptyCategories.filter((c: any) => PRIORITY_SLUGS.includes(c.slug)),
    ...nonEmptyCategories.filter((c: any) => !PRIORITY_SLUGS.includes(c.slug)),
  ];

  // Category rails (top 3 categories with products)
  const topCategories = sortedCategories.slice(0, 5);
  const categoryProducts = await Promise.all(
    topCategories.map(async (c: any) => {
      try {
        const { products } = await getProductsByCategory(c.slug, { limit: 8 });
        return { slug: c.slug, name: c.name, icon: c.icon || "📦", products };
      } catch {
        return { slug: c.slug, name: c.name, icon: c.icon || "📦", products: [] };
      }
    })
  );


  return (
    <div>
      <WebsiteJsonLd />
      <OrganizationJsonLd />

      {/* ===== 0. FIRST SALE BANNER ===== */}
      <FirstSaleBanner
        topDealName={dealOfTheDay?.name}
        topDealSlug={dealOfTheDay?.slug}
        topDealPrice={dealOfTheDay?.bestOffer?.price}
        topDealDiscount={dealOfTheDay?.bestOffer?.discount}
        activeOffers={stats.activeOffers || 0}
      />

      {/* ===== 1. HERO — Premium, mobile-first ===== */}
      <section id="hero" className="hero-premium relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-brand-500/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-6 md:pt-14 md:pb-10">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-display font-extrabold text-2xl md:text-4xl text-surface-900 tracking-tight leading-[1.15]">
              Encontre o <span className="text-gradient">melhor preço</span> com IA
            </h1>

            <p className="mt-2 text-surface-500 text-sm md:text-base max-w-md mx-auto">
              Busque qualquer produto. Comparamos preços, analisamos histórico e te ajudamos a decidir.
            </p>

            <div className="mt-5 max-w-xl mx-auto">
              <SearchBar large />
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {["iPhone 15", "Air Fryer", "PS5", "Notebook", "Fone Bluetooth"].map((tag, i) => (
                <a key={tag} href={`/busca?q=${encodeURIComponent(tag)}`}
                  className="px-2.5 py-1 rounded-full bg-white border border-surface-200 text-[11px] text-surface-500 hover:text-brand-600 hover:border-brand-500/30 hover:bg-brand-50 transition-all shadow-sm hover:scale-[1.03]">
                  {i === 0 && <span className="mr-0.5">🔥</span>}{tag}
                </a>
              ))}
            </div>
          </div>

          {/* Econômetro card — stats integrados */}
          <div className="mt-6">
            <Econometro
              value={Math.round((stats.clickoutsWeek || 3495) * 47.5 + 125000)}
              offers={stats.activeOffers || undefined}
              products={stats.listings || undefined}
              stores={stats.sources || undefined}
            />
          </div>

          {/* Trust bar inline */}
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { name: "Amazon", color: "text-[#FF9900]" },
                { name: "Mercado Livre", color: "text-[#2D3277]" },
                { name: "Shopee", color: "text-[#EE4D2D]" },
                { name: "Shein", color: "text-surface-800" },
              ].map((store) => (
                <span key={store.name} className="flex items-center gap-1 text-xs font-medium text-text-secondary">
                  <svg className="w-3 h-3 text-accent-green flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className={store.color}>{store.name}</span>
                </span>
              ))}
            </div>
            <p className="text-[10px] text-text-muted">+ mais lojas sendo adicionadas</p>
          </div>
        </div>
      </section>

      {/* ===== 2. TRENDING TAGS ===== */}
      {trendingKeywords.length > 0 && (
        <div id="trending">
          <TrendingTags keywords={trendingKeywords.map((t: any) => ({ keyword: t.keyword, url: t.url }))} />
        </div>
      )}

      {/* ===== 2b. RADAR BANNER ===== */}
      <RadarBanner />

      {/* ===== 2c. RETURN USER GREETING ===== */}
      <ReturnUserGreeting />

      {/* ===== 3. OFERTA DO DIA — dynamic, fetches top scores from API ===== */}
      <section id="deal-of-the-day" className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <DealOfTheDay
            product={dedupedHotOffers.length > 0 ? {
              id: dedupedHotOffers[0].id,
              name: dedupedHotOffers[0].name,
              slug: dedupedHotOffers[0].slug,
              imageUrl: dedupedHotOffers[0].imageUrl,
              price: dedupedHotOffers[0].bestOffer.price,
              originalPrice: dedupedHotOffers[0].bestOffer.originalPrice,
              discount: dedupedHotOffers[0].bestOffer.discount,
              sourceName: dedupedHotOffers[0].bestOffer.sourceName,
              offerScore: dedupedHotOffers[0].bestOffer.offerScore,
              isFreeShipping: dedupedHotOffers[0].bestOffer.isFreeShipping,
              offerId: dedupedHotOffers[0].bestOffer.offerId,
            } : undefined}
            extraDeals={dedupedHotOffers.slice(1, 6).map(p => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              imageUrl: p.imageUrl,
              price: p.bestOffer.price,
              originalPrice: p.bestOffer.originalPrice,
              discount: p.bestOffer.discount,
              sourceName: p.bestOffer.sourceName,
              offerScore: p.bestOffer.offerScore,
              isFreeShipping: p.bestOffer.isFreeShipping,
              offerId: p.bestOffer.offerId,
            }))}
          />
        </div>
      </section>

      {/* ===== Empty state if no offers at all ===== */}
      {dedupedHotOffers.length === 0 && dedupedBestSellers.length === 0 && dedupedLowestPrices.length === 0 && (
        <section className="py-10">
          <div className="max-w-2xl mx-auto px-4">
            {/* Search prompt */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-brand-500" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-1">Comece explorando</h2>
              <p className="text-sm text-text-muted mb-4">Nosso sistema está coletando e verificando preços. Use a busca para encontrar produtos específicos.</p>
              <div className="max-w-md mx-auto">
                <SearchBar large />
              </div>
            </div>

            {/* Trending searches */}
            <div className="mb-8">
              <h3 className="font-display font-semibold text-sm text-text-primary mb-3 text-center">Buscas populares</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {TRENDING_SEARCHES.map((tag) => (
                  <a key={tag} href={`/busca?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1.5 rounded-full bg-white border border-surface-200 text-xs text-surface-600 hover:text-brand-600 hover:border-brand-500/30 hover:bg-brand-50 transition-all shadow-sm">
                    {tag}
                  </a>
                ))}
              </div>
            </div>

            {/* Category navigation */}
            {categories.length > 0 && (
              <div>
                <h3 className="font-display font-semibold text-sm text-text-primary mb-3 text-center">Explorar por categoria</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {sortedCategories.slice(0, 8).map((c: any) => (
                    <CategoryCard key={c.slug} slug={c.slug} name={c.name} icon={c.icon} productCount={c._count?.products || 0} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== 6. OFERTAS QUENTES (primary monetization rail) ===== */}
      {dedupedHotOffers.length > 0 && (
        <div id="hot-offers" className="section-alt py-4">
          <RailSection title="Ofertas Quentes" subtitle="Maior score de oferta real agora" href="/ofertas" icon={Flame} iconColor="text-accent-red" liveBadge>
            {dedupedHotOffers.map((p, i) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="hot-offers" position={i} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 7b. CAIU AGORA — price drops in last 24h ===== */}
      <PriceDropRail />

      {/* ===== 8. OPORTUNIDADES DO DIA ===== */}
      <DailyOpportunities />

      {/* ===== 8b. EM ALTA — trending intent products ===== */}
      <OpportunityRail />

      {/* ===== 9. SINCE LAST VISIT ===== */}
      <SinceLastVisit />

      <SectionSeparator />

      {/* ===== 10. MENOR PRECO HISTORICO ===== */}
      {dedupedLowestPrices.length > 0 && (
        <div id="lowest-prices" className="py-4">
          <RailSection title="Menor Preço Histórico" subtitle="Nunca estiveram tão baratos" href="/menor-preco" icon={TrendingDown} iconColor="text-accent-blue">
            {dedupedLowestPrices.map((p, i) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="lowest-prices" position={i} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 11. MAIS VENDIDOS ===== */}
      {dedupedBestSellers.length > 0 && (
        <div id="best-sellers" className="section-alt py-4">
          <RailSection title="Mais Vendidos" subtitle="Produtos mais populares" href="/mais-vendidos" icon={Trophy} iconColor="text-accent-orange">
            {dedupedBestSellers.map((p, i) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="best-sellers" position={i} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 12. MELHOR CUSTO-BENEFICIO ===== */}
      {dedupedBestValue.length > 0 && (
        <div id="best-value" className="py-4">
          <RailSection title="Desconto + Frete Grátis" subtitle="Melhor custo-benefício com entrega inclusa" href="/ofertas" icon={Percent} iconColor="text-accent-purple">
            {dedupedBestValue.map((p, i) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="best-value" position={i} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 13. PRONTOS PARA COMPRAR ===== */}
      {dedupedReadyForCampaign.length > 0 && (
        <div id="ready-for-campaign" className="section-alt py-4">
          <RailSection title="Desconto Verificado" subtitle="Preço real, link direto para a loja" href="/ofertas" icon={Star} iconColor="text-accent-blue">
            {dedupedReadyForCampaign.map((p, i) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="ready-for-campaign" position={i} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 13b. ADICIONADOS RECENTEMENTE — after commercial rails ===== */}
      {dedupedRecentlyImported.length > 0 && (
        <div id="recently-imported" className="py-4">
          <RailSection title="Chegaram Agora" subtitle="Novidades dos últimos dias" href="/ofertas" icon={Sparkles} iconColor="text-accent-green">
            {dedupedRecentlyImported.map((p, i) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="recently-imported" position={i} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== AMAZON PROMO — after commercial rails, before discovery ===== */}
      <AmazonPromo />

      {/* ===== 13c. DESCOBRIR — auto-generated editorial pages ===== */}
      <EditorialRail />

      <SectionSeparator />

      {/* ===== 14. CATEGORIAS ===== */}
      {sortedCategories.length > 0 && (
        <section id="categories" className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeader
              icon={Tag}
              iconColor="text-brand-500"
              title="Categorias"
              subtitle="Explore por categoria"
            />
            <div className="mt-3 grid grid-cols-4 md:grid-cols-8 gap-2">
              {sortedCategories.map((c: any) => (
                <CategoryCard key={c.slug} slug={c.slug} name={c.name} icon={c.icon} productCount={c._count?.products || 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 15. SOCIAL PROOF ===== */}
      {(socialRanking.mostClicked.length > 0 ||
        socialRanking.mostMonitored.length > 0 ||
        socialRanking.mostPopular.length > 0) && (
        <div id="social-proof" className="section-contrast">
          <SocialProof
            mostClicked={socialRanking.mostClicked}
            mostMonitored={socialRanking.mostMonitored}
            mostPopular={socialRanking.mostPopular}
          />
        </div>
      )}

      {/* ===== 15b. DESTAQUE CAROUSEL (spread away from Oferta do Dia) ===== */}
      {dedupedHotOffers.length > 6 && (
        <div id="carousel" className="section-energy">
          <OfferCarousel offers={dedupedHotOffers.slice(6, 12)} />
        </div>
      )}

      {/* ===== 15c. SMART SUGGESTIONS ===== */}
      <SmartSuggestions />

      {/* ===== 16. PERSONALIZED RAILS ===== */}
      <PersonalizedRails />

      {/* ===== 17. CUPONS ===== */}
      {coupons.length > 0 && (
        <section id="coupons" className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <SectionHeader
                icon={Tag}
                iconColor="text-accent-orange"
                title="Cupons Ativos"
                subtitle="Economize com códigos de desconto"
              />
              <Link href="/cupons" className="text-sm text-accent-blue hover:text-brand-500 font-medium">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {coupons.slice(0, 4).map((c: any) => (
                <div key={c.id} className="card p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-accent-blue text-sm">{c.code}</span>
                    <span className="text-[10px] text-text-muted">{c.source?.name || "Geral"}</span>
                  </div>
                  <p className="text-xs text-text-secondary">{c.description}</p>
                  {c.endAt && (
                    <span className="text-[10px] text-accent-orange">
                      Expira em {new Date(c.endAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <SectionSeparator />

      {/* ===== 18. TOP POR CATEGORIA ===== */}
      <div id="category-rails" className="py-4">
        {categoryProducts.filter((c) => c.products.length > 0).map((c) => (
          <CategoryRail key={c.slug} title={c.name} slug={c.slug} icon={c.icon} products={c.products} />
        ))}
      </div>

      {/* ===== 18b. EMAIL CAPTURE ===== */}
      <section id="email-capture" className="py-6">
        <div className="max-w-7xl mx-auto px-4 max-w-xl">
          <EmailCapture context="homepage" />
        </div>
      </section>

      {/* ===== 19. RECENTLY VIEWED ===== */}
      <RecentlyViewedRail />

      {/* ===== 19b. AI ASSISTANT CTA ===== */}
      <AIAssistantCTA />

      {/* ===== 20. NEWSLETTER ===== */}
      <div id="newsletter" className="section-deep">
        <Newsletter />
      </div>

      {/* ===== 20b. WHY PROMOSNAP ===== */}
      <WhyPromoSnap />

      {/* ===== 21. SEO ===== */}
      <section id="seo" className="py-8 section-alt">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display font-bold text-xl text-text-primary mb-2">
            PromoSnap — Comparador de precos com historico real
          </h2>
          <div className="space-y-3 text-sm text-text-muted leading-relaxed">
            <p>
              O PromoSnap e a central de inteligencia de compra do Brasil. Monitoramos precos de{" "}
              <Link href="/loja/amazon-br" className="text-brand-500 hover:underline">Amazon</Link>,{" "}
              <Link href="/loja/mercadolivre" className="text-brand-500 hover:underline">Mercado Livre</Link>,{" "}
              <Link href="/loja/shopee" className="text-brand-500 hover:underline">Shopee</Link> e{" "}
              <Link href="/loja/shein" className="text-brand-500 hover:underline">Shein</Link>{" "}
              com historico de 90 dias para voce saber se o desconto e real antes de comprar.
            </p>
            <p>
              Nosso algoritmo de{" "}
              <Link href="/como-funciona" className="text-brand-500 hover:underline">score de oferta</Link>{" "}
              analisa desconto real, reputacao do vendedor, tendencia de preco e frete para recomendar o melhor momento de compra.
              Encontre o{" "}
              <Link href="/menor-preco" className="text-brand-500 hover:underline">menor preco historico</Link>,{" "}
              <Link href="/mais-vendidos" className="text-brand-500 hover:underline">produtos mais vendidos</Link>,{" "}
              <Link href="/cupons" className="text-brand-500 hover:underline">cupons de desconto</Link> e{" "}
              <Link href="/ofertas" className="text-brand-500 hover:underline">ofertas quentes</Link> verificadas diariamente.
            </p>
            <p>
              Categorias populares:{" "}
              {["celulares", "notebooks", "fones", "tvs", "games", "eletrodomesticos"].map((cat, i) => (
                <span key={cat}>
                  {i > 0 && ", "}
                  <Link href={`/categoria/${cat}`} className="text-brand-500 hover:underline">{cat}</Link>
                </span>
              ))}
              {" "}e muito mais. Todos com comparacao entre lojas e alertas de queda de preco.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SEO DISCOVERY — links para páginas programáticas de alta intenção ===== */}
      <section className="py-6 border-t border-surface-100">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-base font-semibold text-text-primary mb-4">Guias e Comparativos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Melhores */}
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Melhores de 2026</p>
              <ul className="space-y-1">
                {[
                  { slug: "melhores-celulares",       label: "Melhores Celulares" },
                  { slug: "melhores-notebooks",       label: "Melhores Notebooks" },
                  { slug: "melhores-fones-bluetooth", label: "Melhores Fones Bluetooth" },
                  { slug: "melhores-smart-tvs",       label: "Melhores Smart TVs" },
                  { slug: "melhores-air-fryers",      label: "Melhores Air Fryers" },
                ].map((p) => (
                  <li key={p.slug}>
                    <Link href={`/melhores/${p.slug}`} className="text-sm text-text-secondary hover:text-brand-500 transition-colors">
                      {p.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/melhores/melhores-cadeiras-gamer" className="text-sm text-text-secondary hover:text-brand-500">Melhores Cadeiras Gamer</Link>
                </li>
              </ul>
            </div>

            {/* Comparativos */}
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Comparar Produtos</p>
              <ul className="space-y-1">
                {[
                  { slug: "iphone-vs-samsung",        label: "iPhone vs Samsung" },
                  { slug: "airfryer-philips-vs-arno", label: "Philips vs Arno Air Fryer" },
                  { slug: "kindle-vs-kobo",           label: "Kindle vs Kobo" },
                  { slug: "playstation-vs-xbox",      label: "PlayStation vs Xbox" },
                  { slug: "earbuds-vs-headphone",     label: "Earbuds vs Headphone" },
                ].map((c) => (
                  <li key={c.slug}>
                    <Link href={`/comparar/${c.slug}`} className="text-sm text-text-secondary hover:text-brand-500 transition-colors">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vale a pena + categorias-destaque */}
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Vale a Pena Comprar?</p>
              <ul className="space-y-1">
                {[
                  { slug: "airfryer-vale-a-pena",   label: "Air Fryer vale a pena?" },
                  { slug: "kindle-vale-a-pena",      label: "Kindle vale a pena?" },
                  { slug: "ipad-vale-a-pena",        label: "iPad vale a pena?" },
                  { slug: "smartwatch-vale-a-pena",  label: "Smartwatch vale a pena?" },
                ].map((v) => (
                  <li key={v.slug}>
                    <Link href={`/vale-a-pena/${v.slug}`} className="text-sm text-text-secondary hover:text-brand-500 transition-colors">
                      {v.label}
                    </Link>
                  </li>
                ))}
                <li className="pt-1">
                  <Link href="/guias" className="text-sm font-medium text-brand-500 hover:underline">→ Ver todos os guias</Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
