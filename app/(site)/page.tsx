import { Flame, TrendingDown, Trophy, Sparkles, Tag, Database, ShoppingBag, Store, Shield, Eye, Clock } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";
import RailSection from "@/components/home/RailSection";
import OfferCard from "@/components/cards/OfferCard";
import CategoryCard from "@/components/cards/CategoryCard";
import CouponCopy from "@/components/ui/CouponCopy";
import { MOCK_HOT_OFFERS, MOCK_LOWEST, MOCK_BEST_SELLERS, MOCK_CATEGORIES, MOCK_COUPONS } from "@/lib/mock-data";
import { getHotOffers, getBestSellers, getLowestPrices, getSiteStats } from "@/lib/db/queries";
import type { ProductCard } from "@/types";

export const revalidate = 300;

export default async function HomePage() {
  let hotOffers: ProductCard[] = [];
  let lowestPrices: ProductCard[] = [];
  let bestSellers: ProductCard[] = [];
  let usingMockData = false;
  let siteStats = { offersCount: 0, sourcesCount: 0 };

  try {
    [hotOffers, lowestPrices, bestSellers, siteStats] = await Promise.all([
      getHotOffers(8),
      getLowestPrices(8),
      getBestSellers(8),
      getSiteStats(),
    ]);

    if (hotOffers.length === 0 && lowestPrices.length === 0 && bestSellers.length === 0) {
      usingMockData = true;
      hotOffers = MOCK_HOT_OFFERS;
      lowestPrices = MOCK_LOWEST;
      bestSellers = MOCK_BEST_SELLERS;
    }
  } catch {
    usingMockData = true;
    hotOffers = MOCK_HOT_OFFERS;
    lowestPrices = MOCK_LOWEST;
    bestSellers = MOCK_BEST_SELLERS;
  }

  const totalOffers = siteStats.offersCount || hotOffers.length + lowestPrices.length + bestSellers.length;

  return (
    <div>
      {/* ===== DEV BANNER ===== */}
      {usingMockData && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-sm text-amber-700 flex items-center justify-center gap-2">
          <Database className="w-4 h-4 shrink-0" />
          <span>
            Exibindo dados de demonstração.{" "}
            <a href="/api/admin/ingest?q=smartphone&limit=20" className="font-semibold underline hover:text-amber-900">
              Importar dados reais do Mercado Livre
            </a>
          </span>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/60 via-purple-50/20 to-white">
        {/* Gradient mesh */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[300px] bg-accent-purple/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-10 pb-8 md:pt-16 md:pb-14">
          <div className="max-w-2xl mx-auto text-center">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-5 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              🔥 {totalOffers} ofertas atualizadas agora
            </div>

            <h1 className="font-display font-extrabold text-3xl md:text-5xl text-surface-900 tracking-tight leading-[1.1] animate-slide-up">
              Encontre ofertas{" "}
              <span className="text-gradient">de verdade</span>
            </h1>

            <p className="mt-4 text-surface-500 text-base md:text-lg max-w-lg mx-auto animate-slide-up" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
              Compare preços, veja o histórico real e descubra se o desconto é real ou marketing.
            </p>

            <div className="mt-8 max-w-xl mx-auto animate-slide-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
              <SearchBar large />
            </div>

            {/* Popular tags with stagger */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {["iPhone 15", "Air Fryer", "PS5", "Notebook", "Fone Bluetooth"].map((tag, i) => (
                <a key={tag} href={`/busca?q=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 rounded-full bg-white border border-surface-200 text-xs text-surface-500 hover:text-accent-blue hover:border-accent-blue/30 shadow-sm transition-all animate-slide-up"
                  style={{ animationDelay: `${300 + i * 50}ms`, animationFillMode: "both" }}>
                  {tag}
                </a>
              ))}
            </div>
          </div>

          {/* Stats with icons */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
            <div className="card text-center p-3 animate-slide-up" style={{ animationDelay: "400ms", animationFillMode: "both" }}>
              <ShoppingBag className="w-5 h-5 mx-auto mb-1.5 text-accent-blue" />
              <div className="font-display font-extrabold text-xl md:text-2xl text-accent-blue">{siteStats.offersCount > 0 ? siteStats.offersCount.toLocaleString("pt-BR") : "\u2014"}</div>
              <div className="text-[10px] md:text-xs text-surface-500 mt-1">Ofertas ativas</div>
            </div>
            <div className="card text-center p-3 animate-slide-up" style={{ animationDelay: "450ms", animationFillMode: "both" }}>
              <TrendingDown className="w-5 h-5 mx-auto mb-1.5 text-accent-green" />
              <div className="font-display font-extrabold text-xl md:text-2xl text-accent-green">{lowestPrices.length > 0 ? lowestPrices.length.toString() : "\u2014"}</div>
              <div className="text-[10px] md:text-xs text-surface-500 mt-1">Menor preço agora</div>
            </div>
            <div className="card text-center p-3 animate-slide-up" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
              <Tag className="w-5 h-5 mx-auto mb-1.5 text-accent-orange" />
              <div className="font-display font-extrabold text-xl md:text-2xl text-accent-orange">Em breve</div>
              <div className="text-[10px] md:text-xs text-surface-500 mt-1">Cupons válidos</div>
            </div>
            <div className="card text-center p-3 animate-slide-up" style={{ animationDelay: "550ms", animationFillMode: "both" }}>
              <Store className="w-5 h-5 mx-auto mb-1.5 text-accent-purple" />
              <div className="font-display font-extrabold text-xl md:text-2xl text-accent-purple">{siteStats.sourcesCount > 0 ? siteStats.sourcesCount.toString() : "\u2014"}</div>
              <div className="text-[10px] md:text-xs text-surface-500 mt-1">Lojas monitoradas</div>
            </div>
          </div>
        </div>
      </section>

      {/* OFERTAS QUENTES */}
      <RailSection title="Ofertas Quentes" subtitle="Maior score de oferta real agora" href="/ofertas" icon={<Flame className="w-5 h-5 text-accent-red" />} count={hotOffers.length}>
        {hotOffers.map((p, i) => (
          <div key={p.id} className="w-[200px] md:w-[260px] flex-shrink-0 animate-slide-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>

      {/* CATEGORIAS */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-accent-purple to-accent-blue hidden sm:block" />
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-accent-purple" />
              <h2 className="font-display font-bold text-lg text-surface-900">Categorias</h2>
            </div>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {MOCK_CATEGORIES.map((c, i) => (
              <div key={c.slug} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}>
                <CategoryCard slug={c.slug} name={c.name} icon={c.icon} productCount={c.productCount} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENOR PREÇO */}
      <RailSection title="Menor Preço Histórico" subtitle="Nunca estiveram tão baratos" href="/menor-preco" icon={<TrendingDown className="w-5 h-5 text-accent-blue" />} count={lowestPrices.length}>
        {lowestPrices.map((p, i) => (
          <div key={p.id} className="w-[200px] md:w-[260px] flex-shrink-0 animate-slide-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>

      {/* MAIS VENDIDOS */}
      <RailSection title="Mais Vendidos" subtitle="Produtos mais populares" href="/mais-vendidos" icon={<Trophy className="w-5 h-5 text-accent-orange" />} count={bestSellers.length}>
        {bestSellers.map((p, i) => (
          <div key={p.id} className="w-[200px] md:w-[260px] flex-shrink-0 animate-slide-up" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>

      {/* CUPONS */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-8 rounded-full bg-gradient-to-b from-accent-orange to-accent-yellow hidden sm:block" />
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-accent-orange" />
              <h2 className="font-display font-bold text-lg text-surface-900">Cupons Ativos</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOCK_COUPONS.map((c) => (
              <div key={c.id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <CouponCopy code={c.code} />
                  <span className="text-xs text-surface-500">{c.sourceName}</span>
                </div>
                <p className="text-sm text-surface-600">{c.description}</p>
                <span className="text-xs text-accent-orange">Expira em {c.endAt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUE PROMOSNAP? */}
      <section className="py-10 bg-surface-50 border-t border-b border-surface-200">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display font-bold text-xl text-surface-900 text-center mb-8">Por que PromoSnap?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <Shield className="w-10 h-10 mx-auto mb-3 text-accent-blue" />
              <h3 className="font-display font-bold text-surface-900 mb-2">Preço Real</h3>
              <p className="text-sm text-surface-500 leading-relaxed">Verificamos o histórico de 90 dias para garantir que o desconto é genuíno.</p>
            </div>
            <div className="card p-6 text-center">
              <Eye className="w-10 h-10 mx-auto mb-3 text-accent-green" />
              <h3 className="font-display font-bold text-surface-900 mb-2">Sem Enganação</h3>
              <p className="text-sm text-surface-500 leading-relaxed">Desconto calculado sobre a média real, não preço inflado.</p>
            </div>
            <div className="card p-6 text-center">
              <Clock className="w-10 h-10 mx-auto mb-3 text-accent-purple" />
              <h3 className="font-display font-bold text-surface-900 mb-2">Economize Tempo</h3>
              <p className="text-sm text-surface-500 leading-relaxed">Comparamos 4 lojas automaticamente para você encontrar o melhor preço.</p>
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER CTA */}
      <section className="py-10 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="font-display font-bold text-xl text-surface-900 mb-2">Receba as melhores ofertas no seu email</h2>
          <p className="text-sm text-surface-500 mb-6">Enviamos no máximo 1x por dia. Sem spam.</p>
          <form className="flex gap-2 max-w-md mx-auto" action="#">
            <input type="email" placeholder="seu@email.com" className="input flex-1" />
            <button type="button" className="btn-primary whitespace-nowrap">Inscrever-se</button>
          </form>
        </div>
      </section>

      {/* SEO */}
      <section className="py-10">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display font-bold text-xl text-surface-900 mb-3">
            PromoSnap — Ofertas reais com histórico de preço
          </h2>
          <p className="text-sm text-surface-500 leading-relaxed">
            O PromoSnap monitora os maiores marketplaces do Brasil para encontrar ofertas reais.
            Comparamos preços da Amazon, Mercado Livre, Shopee e Shein, calculamos um score de oferta
            baseado em dados reais e mostramos os produtos mais vendidos, menor preço histórico e cupons ativos.
          </p>
        </div>
      </section>
    </div>
  );
}
