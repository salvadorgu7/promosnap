import { Flame, TrendingDown, Trophy, Sparkles, Tag, Shield, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import RailSection from "@/components/home/RailSection";
import OfferCard from "@/components/cards/OfferCard";
import CategoryCard from "@/components/cards/CategoryCard";
import { getHotOffers, getBestSellers, getLowestPrices, getCategories, getSiteStats, getActiveCoupons } from "@/lib/db/queries";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [hotOffers, bestSellers, lowestPrices, categories, stats, coupons] = await Promise.all([
    getHotOffers(16).catch(() => []),
    getBestSellers(16).catch(() => []),
    getLowestPrices(16).catch(() => []),
    getCategories().catch(() => []),
    getSiteStats().catch(() => ({ listings: 0, activeOffers: 0, sources: 4, clickoutsToday: 0, clickoutsWeek: 0, categories: 0, brands: 0 })),
    getActiveCoupons().catch(() => []),
  ]);

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              {stats.activeOffers > 0
                ? `${formatNumber(stats.activeOffers)} ofertas verificadas`
                : "Ofertas verificadas com histórico real"}
            </div>

            <h1 className="font-display font-extrabold text-4xl md:text-5xl text-surface-900 tracking-tight leading-[1.1]">
              Encontre ofertas{" "}
              <span className="text-gradient">de verdade</span>
            </h1>

            <p className="mt-4 text-surface-500 text-lg max-w-lg mx-auto">
              Compare preços, veja o histórico real e descubra se o desconto é real ou marketing.
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

          {/* Stats — rendered individually to avoid serialization issues */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="card text-center p-3">
              <div className="font-display font-extrabold text-2xl text-accent-blue">
                {stats.activeOffers > 0 ? formatNumber(stats.activeOffers) : "100+"}
              </div>
              <div className="text-xs text-text-muted mt-1">Ofertas ativas</div>
            </div>
            <div className="card text-center p-3">
              <div className="font-display font-extrabold text-2xl text-accent-green">
                {stats.listings > 0 ? formatNumber(stats.listings) : "107"}
              </div>
              <div className="text-xs text-text-muted mt-1">Produtos monitorados</div>
            </div>
            <div className="card text-center p-3">
              <div className="font-display font-extrabold text-2xl text-accent-orange">
                {stats.brands > 0 ? stats.brands : "30+"}
              </div>
              <div className="text-xs text-text-muted mt-1">Marcas comparadas</div>
            </div>
            <div className="card text-center p-3">
              <div className="font-display font-extrabold text-2xl text-brand-500">
                {stats.sources}
              </div>
              <div className="text-xs text-text-muted mt-1">Lojas monitoradas</div>
            </div>
          </div>
        </div>
      </section>

      {/* OFERTAS QUENTES */}
      {hotOffers.length > 0 && (
        <RailSection title="Ofertas Quentes" subtitle="Maior score de oferta real agora" href="/ofertas" icon={Flame} iconColor="text-accent-red">
          {hotOffers.map((p) => (
            <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
              <OfferCard product={p} />
            </div>
          ))}
        </RailSection>
      )}

      {/* CATEGORIAS */}
      {categories.length > 0 && (
        <section className="py-6">
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

      {/* MENOR PREÇO */}
      {lowestPrices.length > 0 && (
        <RailSection title="Menor Preço Histórico" subtitle="Nunca estiveram tão baratos" href="/menor-preco" icon={TrendingDown} iconColor="text-accent-blue">
          {lowestPrices.map((p) => (
            <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
              <OfferCard product={p} />
            </div>
          ))}
        </RailSection>
      )}

      {/* MAIS VENDIDOS */}
      {bestSellers.length > 0 && (
        <RailSection title="Mais Vendidos" subtitle="Produtos mais populares" href="/mais-vendidos" icon={Trophy} iconColor="text-accent-orange">
          {bestSellers.map((p) => (
            <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
              <OfferCard product={p} />
            </div>
          ))}
        </RailSection>
      )}

      {/* CUPONS */}
      {coupons.length > 0 && (
        <section className="py-6">
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

      {/* POR QUE PROMOSNAP? */}
      <section className="py-10 bg-surface-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="font-display font-bold text-xl text-text-primary text-center mb-8">
            Por que usar o PromoSnap?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-accent-blue" />
              </div>
              <h3 className="font-display font-semibold text-text-primary mb-2">Histórico Real</h3>
              <p className="text-sm text-text-muted">Acompanhe se o desconto é real comparando com o histórico de preço dos últimos 90 dias.</p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-accent-green" />
              </div>
              <h3 className="font-display font-semibold text-text-primary mb-2">Score de Oferta</h3>
              <p className="text-sm text-text-muted">Nosso algoritmo analisa desconto, popularidade, confiança e frete para gerar um score inteligente.</p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-accent-purple" />
              </div>
              <h3 className="font-display font-semibold text-text-primary mb-2">Transparência Total</h3>
              <p className="text-sm text-text-muted">Mostramos exatamente de onde vêm os dados e como ganhamos dinheiro. Sem pegadinhas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO */}
      <section className="py-10">
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
