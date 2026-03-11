import { Flame, TrendingDown, Trophy, Sparkles, Tag } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";
import RailSection from "@/components/home/RailSection";
import OfferCard from "@/components/cards/OfferCard";
import CategoryCard from "@/components/cards/CategoryCard";
import { MOCK_HOT_OFFERS, MOCK_LOWEST, MOCK_BEST_SELLERS, MOCK_CATEGORIES, MOCK_COUPONS } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-10 md:pt-16 md:pb-14">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Ofertas verificadas com histórico real
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

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "Ofertas ativas", value: "12.4K", color: "text-accent-blue" },
              { label: "Menor preço agora", value: "2.1K", color: "text-accent-green" },
              { label: "Cupons válidos", value: "340", color: "text-accent-orange" },
              { label: "Lojas monitoradas", value: "4", color: "text-brand-500" },
            ].map((s) => (
              <div key={s.label} className="card text-center p-3">
                <div className={`font-display font-extrabold text-2xl ${s.color}`}>{s.value}</div>
                <div className="text-xs text-text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTAS QUENTES */}
      <RailSection title="Ofertas Quentes" subtitle="Maior score de oferta real agora" href="/ofertas" icon={Flame} iconColor="text-accent-red">
        {MOCK_HOT_OFFERS.map((p) => (
          <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>

      {/* CATEGORIAS */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-brand-500" />
            <h2 className="font-display font-bold text-lg text-text-primary">Categorias</h2>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {MOCK_CATEGORIES.map((c) => (
              <CategoryCard key={c.slug} slug={c.slug} name={c.name} icon={c.icon} productCount={c.productCount} />
            ))}
          </div>
        </div>
      </section>

      {/* MENOR PREÇO */}
      <RailSection title="Menor Preço Histórico" subtitle="Nunca estiveram tão baratos" href="/menor-preco" icon={TrendingDown} iconColor="text-accent-blue">
        {MOCK_LOWEST.map((p) => (
          <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>

      {/* MAIS VENDIDOS */}
      <RailSection title="Mais Vendidos" subtitle="Produtos mais populares" href="/mais-vendidos" icon={Trophy} iconColor="text-accent-orange">
        {MOCK_BEST_SELLERS.map((p) => (
          <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>

      {/* CUPONS */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-bold text-lg text-text-primary">Cupons Ativos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MOCK_COUPONS.map((c) => (
              <div key={c.id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-accent-blue text-sm">{c.code}</span>
                  <span className="text-xs text-text-muted">{c.sourceName}</span>
                </div>
                <p className="text-sm text-text-secondary">{c.description}</p>
                <span className="text-xs text-accent-orange">Expira em {c.endAt}</span>
              </div>
            ))}
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
