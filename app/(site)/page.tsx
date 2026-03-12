import { Flame, TrendingDown, Trophy, Sparkles, Tag, Shield, TrendingUp, BarChart3, ShieldCheck, Store, Bell, Truck, Star, Search, Users, Send, MessageCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import RailSection from "@/components/home/RailSection";
import OfferCard from "@/components/cards/OfferCard";
import CategoryCard from "@/components/cards/CategoryCard";
import TrendingTags from "@/components/home/TrendingTags";
import DealOfTheDay from "@/components/home/DealOfTheDay";
import RecentlyViewedRail from "@/components/home/RecentlyViewedRail";
import SourcesCompare from "@/components/home/SourcesCompare";
import Newsletter from "@/components/home/Newsletter";
import CategoryRail from "@/components/home/CategoryRail";
import OfferCarousel from "@/components/home/OfferCarousel";
import SinceLastVisit from "@/components/home/SinceLastVisit";
import PersonalizedNews from "@/components/home/PersonalizedNews";
import PersonalizedRails from "@/components/home/PersonalizedRails";
import SocialProof from "@/components/home/SocialProof";
import WhatChanged from "@/components/home/WhatChanged";
import { getHotOffers, getBestSellers, getLowestPrices, getCategories, getSiteStats, getActiveCoupons, getProductsByCategory, buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";
import { getSocialRanking } from "@/lib/commerce/social-ranking";
import prisma from "@/lib/db/prisma";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [hotOffers, bestSellers, lowestPrices, categories, stats, coupons, trendingKeywords] = await Promise.all([
    getHotOffers(16).catch(() => []),
    getBestSellers(16).catch(() => []),
    getLowestPrices(16).catch(() => []),
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

  // Source stats for comparison section
  let sourceStats: { name: string; slug: string; offerCount: number; status: string }[] = [];
  try {
    const sources = await prisma.source.findMany({ where: { status: "ACTIVE" } });
    sourceStats = await Promise.all(
      sources.map(async (s) => {
        const offerCount = await prisma.offer.count({
          where: { isActive: true, listing: { sourceId: s.id } },
        });
        return { name: s.name, slug: s.slug, offerCount, status: "READY" };
      })
    );
  } catch {}

  // Category rails (top 3 categories with products)
  const topCategories = categories.slice(0, 3);
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
      {/* ===== 1. HERO ===== */}
      <section id="hero" className="hero-premium relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[300px] bg-brand-500/3 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-blue"></span>
              </span>
              {stats.activeOffers > 0
                ? `${formatNumber(stats.activeOffers)} ofertas verificadas`
                : "Ofertas verificadas com historico real"}
            </div>

            <h1 className="font-display font-extrabold text-4xl md:text-5xl text-surface-900 tracking-tight leading-[1.1]">
              O melhor preço com{" "}
              <span className="text-gradient">contexto real</span>
            </h1>

            <p className="mt-4 text-surface-500 text-lg max-w-lg mx-auto">
              Compare preços entre lojas, veja o histórico de 90 dias, leia avaliações consolidadas e saiba se o desconto vale a pena antes de comprar.
            </p>

            <div className="mt-8 max-w-xl mx-auto">
              <SearchBar large />
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["iPhone 15", "Air Fryer", "PS5", "Notebook", "Fone Bluetooth"].map((tag) => (
                <a key={tag} href={`/busca?q=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 rounded-full bg-white border border-surface-200 text-xs text-surface-500 hover:text-accent-blue hover:border-accent-blue/30 transition-all shadow-sm">
                  {tag}
                </a>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="card-depth text-center p-4">
              <div className="font-display font-extrabold text-2xl text-accent-blue">
                {stats.activeOffers > 0 ? formatNumber(stats.activeOffers) : "100+"}
              </div>
              <div className="text-xs text-text-muted mt-1">Ofertas ativas</div>
            </div>
            <div className="card-depth text-center p-4">
              <div className="font-display font-extrabold text-2xl text-accent-green">
                {stats.listings > 0 ? formatNumber(stats.listings) : "107"}
              </div>
              <div className="text-xs text-text-muted mt-1">Produtos monitorados</div>
            </div>
            <div className="card-depth text-center p-4">
              <div className="font-display font-extrabold text-2xl text-accent-orange">
                {stats.brands > 0 ? stats.brands : "30+"}
              </div>
              <div className="text-xs text-text-muted mt-1">Marcas comparadas</div>
            </div>
            <div className="card-depth text-center p-4">
              <div className="font-display font-extrabold text-2xl text-brand-500">
                {stats.sources}
              </div>
              <div className="text-xs text-text-muted mt-1">Lojas monitoradas</div>
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

      {/* ===== 3. WHAT CHANGED — compact stats ticker ===== */}
      <WhatChanged />

      {/* ===== 4. OFFER CAROUSEL ===== */}
      {hotOffers.length > 0 && (
        <div id="carousel" className="section-energy">
          <OfferCarousel offers={hotOffers.slice(0, 5)} />
        </div>
      )}

      {/* ===== 5. DEAL OF THE DAY ===== */}
      {dealOfTheDay && (
        <section id="deal-of-the-day" className="py-6 section-border-top">
          <div className="max-w-7xl mx-auto px-4">
            <DealOfTheDay
              product={{
                id: dealOfTheDay.id,
                name: dealOfTheDay.name,
                slug: dealOfTheDay.slug,
                imageUrl: dealOfTheDay.imageUrl,
                price: dealOfTheDay.bestOffer.price,
                originalPrice: dealOfTheDay.bestOffer.originalPrice,
                discount: dealOfTheDay.bestOffer.discount,
                sourceName: dealOfTheDay.bestOffer.sourceName,
                offerScore: dealOfTheDay.bestOffer.offerScore,
                isFreeShipping: dealOfTheDay.bestOffer.isFreeShipping,
              }}
            />
          </div>
        </section>
      )}

      {/* ===== 6. SINCE LAST VISIT — only for returning users ===== */}
      <SinceLastVisit />

      {/* ===== 7. PERSONALIZED NEWS — based on user interests ===== */}
      <PersonalizedNews />

      {/* ===== 8. CATEGORIAS ===== */}
      {categories.length > 0 && (
        <section id="categories" className="py-6 section-cool section-border-top">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-brand-500" />
              <h2 className="font-display font-bold text-lg text-text-primary">Categorias</h2>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {categories.map((c: any) => (
                <CategoryCard key={c.slug} slug={c.slug} name={c.name} icon={c.icon} productCount={c._count?.products || 0} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 9. SOCIAL PROOF / RANKING ===== */}
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

      {/* ===== 10. OFERTAS QUENTES ===== */}
      {hotOffers.length > 0 && (
        <div id="hot-offers" className="section-alt">
          <RailSection title="Ofertas Quentes" subtitle="Maior score de oferta real agora" href="/ofertas" icon={Flame} iconColor="text-accent-red">
            {hotOffers.map((p) => (
              <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 11. PERSONALIZED RAILS — for voce / quedas / baseado nos favoritos ===== */}
      <PersonalizedRails />

      {/* ===== 12. MENOR PRECO HISTORICO ===== */}
      {lowestPrices.length > 0 && (
        <div id="lowest-prices" className="section-highlight">
          <RailSection title="Menor Preço Histórico" subtitle="Nunca estiveram tão baratos" href="/menor-preco" icon={TrendingDown} iconColor="text-accent-blue">
            {lowestPrices.map((p) => (
              <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 13. COMPARAR FONTES ===== */}
      {sourceStats.length > 0 && (
        <div id="sources-compare" className="section-highlight">
          <SourcesCompare sources={sourceStats} />
        </div>
      )}

      {/* ===== 14. MAIS VENDIDOS ===== */}
      {bestSellers.length > 0 && (
        <div id="best-sellers" className="section-alt">
          <RailSection title="Mais Vendidos" subtitle="Produtos mais populares" href="/mais-vendidos" icon={Trophy} iconColor="text-accent-orange">
            {bestSellers.map((p) => (
              <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* ===== 15. CUPONS ===== */}
      {coupons.length > 0 && (
        <section id="coupons" className="py-6 section-warm section-border-top">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-accent-orange" />
                <h2 className="font-display font-bold text-lg text-text-primary">Cupons Ativos</h2>
              </div>
              <Link href="/cupons" className="text-sm text-accent-blue hover:text-brand-500 font-medium">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {coupons.slice(0, 4).map((c: any) => (
                <div key={c.id} className="card p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-accent-blue text-sm">{c.code}</span>
                    <span className="text-xs text-text-muted">{c.source?.name || "Geral"}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{c.description}</p>
                  {c.endAt && (
                    <span className="text-xs text-accent-orange">
                      Expira em {new Date(c.endAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 16. TOP POR CATEGORIA ===== */}
      <div id="category-rails">
        {categoryProducts.filter((c) => c.products.length > 0).map((c) => (
          <CategoryRail key={c.slug} title={c.name} slug={c.slug} icon={c.icon} products={c.products} />
        ))}
      </div>

      {/* ===== 17. RECENTLY VIEWED ===== */}
      <RecentlyViewedRail />

      {/* ===== 18. POR QUE PROMOSNAP? ===== */}
      <section id="why-promosnap" className="py-12 md:py-16 section-highlight section-border-top">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Diferenciais
            </div>
            <h2 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary">
              Por que usar o PromoSnap?
            </h2>
            <p className="mt-3 text-surface-500 text-sm md:text-base max-w-xl mx-auto">
              Mais do que um comparador de preços. Uma camada de inteligência sobre suas compras online.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <div className="card-depth p-6 group hover:border-accent-blue/30">
              <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-accent-blue" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">Preco Verificado</h3>
              <p className="text-sm text-text-muted leading-relaxed">Cada preco e verificado direto na fonte. Historico de 90 dias mostra se o desconto e real ou maquiagem.</p>
            </div>
            <div className="card-depth p-6 group hover:border-accent-green/30">
              <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Store className="w-6 h-6 text-accent-green" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">Comparacao entre Lojas</h3>
              <p className="text-sm text-text-muted leading-relaxed">Amazon, Mercado Livre, Shopee e Shein lado a lado. Veja quem tem o melhor preco agora.</p>
            </div>
            <div className="card-depth p-6 group hover:border-accent-orange/30">
              <div className="w-12 h-12 rounded-xl bg-accent-orange/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6 text-accent-orange" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">Avaliacao Consolidada</h3>
              <p className="text-sm text-text-muted leading-relaxed">Reunimos avaliacoes de diferentes marketplaces para voce ter uma visao completa antes de decidir.</p>
            </div>
            <div className="card-depth p-6 group hover:border-accent-red/30">
              <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bell className="w-6 h-6 text-accent-red" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">Alerta de Preco</h3>
              <p className="text-sm text-text-muted leading-relaxed">Defina o preco desejado e receba um alerta quando o produto atingir o valor. Sem precisar ficar monitorando.</p>
            </div>
            <div className="card-depth p-6 group hover:border-accent-purple/30">
              <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6 text-accent-purple" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">Entrega e Prazo</h3>
              <p className="text-sm text-text-muted leading-relaxed">Informacoes de frete e prazo de entrega de cada loja. O menor preco nem sempre e a melhor escolha.</p>
            </div>
            <div className="card-depth p-6 group hover:border-brand-500/30">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-6 h-6 text-brand-500" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">Curadoria Real</h3>
              <p className="text-sm text-text-muted leading-relaxed">Nao mostramos tudo. Nosso algoritmo filtra ofertas reais e destaca so o que realmente vale a pena.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 19. COMMUNITY CHANNELS ===== */}
      <section id="community" className="py-8 section-cool section-border-top">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              <h2 className="font-display font-bold text-lg text-text-primary">
                Canais da Comunidade
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/20">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                Atualizado agora
              </span>
            </div>
            <Link href="/canais" className="text-sm text-accent-blue hover:text-brand-500 font-medium flex items-center gap-1">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/canais" className="card p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform border border-blue-500/10">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-text-primary">Telegram</h3>
                <p className="text-xs text-text-muted">Ofertas verificadas em tempo real</p>
              </div>
            </Link>
            <Link href="/canais" className="card p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform border border-green-500/10">
              <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-text-primary">WhatsApp</h3>
                <p className="text-xs text-text-muted">Resumo diario das melhores ofertas</p>
              </div>
            </Link>
            <Link href="/canais" className="card p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform border border-purple-500/10">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-purple-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-text-primary">Alertas por E-mail</h3>
                <p className="text-xs text-text-muted">Cupons e alertas de preco na caixa</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 20. NEWSLETTER ===== */}
      <div id="newsletter" className="section-deep section-border-top">
        <Newsletter />
      </div>

      {/* ===== 21. SEO ===== */}
      <section id="seo" className="py-10 section-alt section-border-top">
        <div className="max-w-7xl mx-auto px-4 max-w-3xl">
          <h2 className="font-display font-bold text-xl text-text-primary mb-3">
            PromoSnap — Ofertas reais com histórico de preço
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            O PromoSnap monitora os maiores marketplaces do Brasil para encontrar ofertas reais.
            Comparamos preços da Amazon, Mercado Livre, Shopee e Shein, calculamos um score de oferta
            baseado em dados reais e mostramos os produtos mais vendidos, menor preço histórico e cupons ativos.
          </p>
        </div>
      </section>
    </div>
  );
}
