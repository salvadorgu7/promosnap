import { Flame, TrendingDown, Trophy, Sparkles, Tag, Star, Search, ArrowRight, Package, Percent, Zap, Smartphone, Laptop, Footprints, ChevronRight } from "lucide-react";
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

// Lazy-load below-fold client components for faster initial load
const PersonalizedRails = nextDynamic(() => import("@/components/home/PersonalizedRails"));
const SinceLastVisit = nextDynamic(() => import("@/components/home/SinceLastVisit"));
const RecentlyViewedRail = nextDynamic(() => import("@/components/home/RecentlyViewedRail"));
const SmartSuggestions = nextDynamic(() => import("@/components/home/SmartSuggestions"));
import { WebsiteJsonLd, OrganizationJsonLd } from "@/components/seo/JsonLd";
import { getHotOffers, getBestSellers, getLowestPrices, getRecentlyImported, getBestValue, getReadyForCampaign, getCategories, getSiteStats, getActiveCoupons, getProductsByCategory } from "@/lib/db/queries";
import { getSocialRanking } from "@/lib/commerce/social-ranking";
import prisma from "@/lib/db/prisma";
import { formatNumber } from "@/lib/utils";

// Priority categories that should always appear first
const PRIORITY_CATEGORIES = [
  { slug: "celulares", name: "Celulares", icon: "📲", displayIcon: Smartphone, color: "text-accent-blue", bgColor: "bg-accent-blue/8", borderColor: "border-accent-blue/15" },
  { slug: "notebooks", name: "Notebooks", icon: "💻", displayIcon: Laptop, color: "text-accent-purple", bgColor: "bg-accent-purple/8", borderColor: "border-accent-purple/15" },
  { slug: "esportes", name: "Tenis & Esportes", icon: "⚽", displayIcon: Footprints, color: "text-accent-green", bgColor: "bg-accent-green/8", borderColor: "border-accent-green/15" },
] as const;

const TRENDING_SEARCHES = [
  "iPhone 15", "Galaxy S24", "Air Fryer", "PS5", "Notebook Gamer",
  "Fone Bluetooth", "Smart TV 55", "Aspirador Robo",
];

export const dynamic = "force-dynamic";

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
    getSiteStats().catch(() => ({ listings: 0, activeOffers: 0, sources: 4, clickoutsToday: 0, clickoutsWeek: 0, categories: 0, brands: 0 })),
    getActiveCoupons().catch(() => []),
    prisma.trendingKeyword.findMany({ orderBy: [{ fetchedAt: "desc" }, { position: "asc" }], take: 15 }).catch(() => []),
  ]);

  // Social ranking
  const socialRanking = await getSocialRanking(6).catch(() => ({
    mostClicked: [],
    mostMonitored: [],
    mostPopular: [],
  }));

  // Best deal of the day
  const dealOfTheDay = hotOffers.length > 0 ? hotOffers[0] : null;

  // Sort categories so priority ones come first
  const prioritySlugs = PRIORITY_CATEGORIES.map(c => c.slug);
  const sortedCategories = [
    ...categories.filter((c: any) => prioritySlugs.includes(c.slug)),
    ...categories.filter((c: any) => !prioritySlugs.includes(c.slug)),
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

  // Priority category products for featured section
  const priorityCategoryProducts = await Promise.all(
    PRIORITY_CATEGORIES.map(async (pc) => {
      try {
        const { products } = await getProductsByCategory(pc.slug, { limit: 6 });
        return { ...pc, products };
      } catch {
        return { ...pc, products: [] as any[] };
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

      {/* ===== 1. HERO — Central de Inteligencia de Compra ===== */}
      <section id="hero" className="hero-premium relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-brand-500/6 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-accent-purple/4 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-10 pb-8 md:pt-14 md:pb-12">
          <div className="max-w-2xl mx-auto text-center">
            {/* Intelligence branding badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-500/20 text-brand-600 text-xs font-semibold mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              {stats.activeOffers > 0
                ? `${formatNumber(stats.activeOffers)} ofertas verificadas`
                : "Ofertas verificadas com historico real"}
            </div>

            <h1 className="font-display font-extrabold text-3xl md:text-5xl text-surface-900 tracking-tight leading-[1.1]">
              Economize de verdade com{" "}
              <span className="text-gradient">dados reais</span>
            </h1>

            <p className="mt-2 text-surface-500 text-base max-w-lg mx-auto">
              Compare precos entre Amazon, Mercado Livre, Shopee e Shein. Historico de 90 dias para voce saber se o desconto e real.
            </p>

            <div className="mt-6 max-w-xl mx-auto">
              <SearchBar large />
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["iPhone 15", "Air Fryer", "PS5", "Notebook", "Fone Bluetooth"].map((tag) => (
                <a key={tag} href={`/busca?q=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 rounded-full bg-white border border-surface-200 text-xs text-surface-500 hover:text-brand-600 hover:border-brand-500/30 hover:bg-brand-50 transition-all shadow-sm">
                  {tag}
                </a>
              ))}
            </div>
          </div>

          {/* Compact stats */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-center">
            <div>
              <div className="font-display font-extrabold text-xl text-accent-blue">
                {stats.activeOffers > 0 ? formatNumber(stats.activeOffers) : "—"}
              </div>
              <div className="text-[11px] text-text-muted">Ofertas ativas</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-xl text-accent-green">
                {stats.listings > 0 ? formatNumber(stats.listings) : "—"}
              </div>
              <div className="text-[11px] text-text-muted">Produtos monitorados</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-xl text-accent-orange">
                {stats.brands > 0 ? stats.brands : "—"}
              </div>
              <div className="text-[11px] text-text-muted">Marcas</div>
            </div>
            <div>
              <div className="font-display font-extrabold text-xl text-accent-green">
                {stats.sources}
              </div>
              <div className="text-[11px] text-text-muted">Lojas comparadas</div>
            </div>
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

      {/* ===== 2d. CATEGORIAS EM DESTAQUE — priority categories with larger cards ===== */}
      <section id="featured-categories" className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeader
            icon={Sparkles}
            iconColor="text-brand-500"
            title="Categorias em Destaque"
            subtitle="As categorias mais procuradas agora"
          />
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRIORITY_CATEGORIES.map((pc) => {
              const Icon = pc.displayIcon;
              const catData = priorityCategoryProducts.find(p => p.slug === pc.slug);
              const count = catData?.products?.length || 0;
              return (
                <Link
                  key={pc.slug}
                  href={`/categoria/${pc.slug}`}
                  className={`card group flex items-center gap-4 p-4 hover:border-brand-500/25 transition-all`}
                >
                  <div className={`w-12 h-12 rounded-xl ${pc.bgColor} flex items-center justify-center flex-shrink-0 border ${pc.borderColor}`}>
                    <Icon className={`w-6 h-6 ${pc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-sm text-text-primary">{pc.name}</h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {count > 0 ? `${count}+ ofertas disponiveis` : "Explorar ofertas"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 3. OFERTA DO DIA — auto-rotates top 6 deals ===== */}
      {hotOffers.length > 0 && (
        <section id="deal-of-the-day" className="py-4">
          <div className="max-w-7xl mx-auto px-4">
            <DealOfTheDay
              product={{
                id: hotOffers[0].id,
                name: hotOffers[0].name,
                slug: hotOffers[0].slug,
                imageUrl: hotOffers[0].imageUrl,
                price: hotOffers[0].bestOffer.price,
                originalPrice: hotOffers[0].bestOffer.originalPrice,
                discount: hotOffers[0].bestOffer.discount,
                sourceName: hotOffers[0].bestOffer.sourceName,
                offerScore: hotOffers[0].bestOffer.offerScore,
                isFreeShipping: hotOffers[0].bestOffer.isFreeShipping,
                offerId: hotOffers[0].bestOffer.offerId,
              }}
              extraDeals={hotOffers.slice(1, 6).map(p => ({
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
      )}

      {/* ===== Empty state if no offers at all ===== */}
      {hotOffers.length === 0 && bestSellers.length === 0 && lowestPrices.length === 0 && (
        <section className="py-10">
          <div className="max-w-2xl mx-auto px-4">
            {/* Search prompt */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-brand-500" />
              </div>
              <h2 className="font-display font-bold text-lg text-text-primary mb-1">Comece explorando</h2>
              <p className="text-sm text-text-muted mb-4">Nosso sistema esta coletando e verificando precos. Use a busca para encontrar produtos especificos.</p>
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

      {/* ===== 5. AMAZON PROMO ===== */}
      <AmazonPromo />

      {/* ===== 6. OFERTAS QUENTES (primary monetization rail) ===== */}
      {hotOffers.length > 0 && (
        <div id="hot-offers" className="section-alt py-4">
          <RailSection title="Ofertas Quentes" subtitle="Maior score de oferta real agora" href="/ofertas" icon={Flame} iconColor="text-accent-red" liveBadge>
            {hotOffers.map((p) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="hot-offers" />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 7. PROMOÇÕES FRESQUINHAS ===== */}
      {recentlyImported.length > 0 && (
        <div id="recently-imported" className="py-4">
          <RailSection title="Promoções Fresquinhas" subtitle="Acabaram de chegar — ultimos 7 dias" href="/ofertas" icon={Sparkles} iconColor="text-accent-green">
            {recentlyImported.map((p) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="recently-imported" />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 8. OPORTUNIDADES DO DIA ===== */}
      <DailyOpportunities />

      {/* ===== 9. SINCE LAST VISIT ===== */}
      <SinceLastVisit />

      <SectionSeparator />

      {/* ===== 10. MENOR PRECO HISTORICO ===== */}
      {lowestPrices.length > 0 && (
        <div id="lowest-prices" className="py-4">
          <RailSection title="Menor Preco Historico" subtitle="Nunca estiveram tao baratos" href="/menor-preco" icon={TrendingDown} iconColor="text-accent-blue">
            {lowestPrices.map((p) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="lowest-prices" />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 11. MAIS VENDIDOS ===== */}
      {bestSellers.length > 0 && (
        <div id="best-sellers" className="section-alt py-4">
          <RailSection title="Mais Vendidos" subtitle="Produtos mais populares" href="/mais-vendidos" icon={Trophy} iconColor="text-accent-orange">
            {bestSellers.map((p) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="best-sellers" />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 12. MELHOR CUSTO-BENEFICIO ===== */}
      {bestValue.length > 0 && (
        <div id="best-value" className="py-4">
          <RailSection title="Melhor Custo-Beneficio" subtitle="Maior desconto com frete gratis" href="/ofertas" icon={Percent} iconColor="text-accent-purple">
            {bestValue.map((p) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="best-value" />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 13. PRONTOS PARA COMPRAR ===== */}
      {readyForCampaign.length > 0 && (
        <div id="ready-for-campaign" className="section-alt py-4">
          <RailSection title="Prontos para Comprar" subtitle="Com desconto e link direto para a loja" href="/ofertas" icon={Star} iconColor="text-accent-blue">
            {readyForCampaign.map((p) => (
              <div key={p.id} className="rail-card">
                <OfferCard product={p} page="home" railSource="ready-for-campaign" />
              </div>
            ))}
          </RailSection>
        </div>
      )}

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
      {hotOffers.length > 6 && (
        <div id="carousel" className="section-energy">
          <OfferCarousel offers={hotOffers.slice(6, 12)} />
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
                subtitle="Economize com codigos de desconto"
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

      {/* ===== 20. NEWSLETTER ===== */}
      <div id="newsletter" className="section-deep">
        <Newsletter />
      </div>

      {/* ===== 21. SEO ===== */}
      <section id="seo" className="py-8 section-alt">
        <div className="max-w-7xl mx-auto px-4 max-w-3xl">
          <h2 className="font-display font-bold text-xl text-text-primary mb-2">
            PromoSnap — Ofertas reais com historico de preco
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            O PromoSnap monitora os maiores marketplaces do Brasil para encontrar ofertas reais.
            Comparamos precos da Amazon, Mercado Livre, Shopee e Shein, calculamos um score de oferta
            baseado em dados reais e mostramos os produtos mais vendidos, menor preco historico e cupons ativos.
          </p>
        </div>
      </section>
    </div>
  );
}
