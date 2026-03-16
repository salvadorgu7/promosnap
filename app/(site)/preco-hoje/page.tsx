import { Flame, TrendingDown, Tag, Package, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata } from "@/lib/seo/metadata";
import { getHotOffers, getLowestPrices, getRecentlyImported, getActiveCoupons } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const today = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return buildMetadata({
    title: `Preço Hoje — Melhores Oportunidades de ${today}`,
    description: `As melhores ofertas de hoje: maiores quedas de preço, ofertas quentes, cupons ativos e produtos novos. Atualizado em tempo real.`,
    path: "/preco-hoje",
  });
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  iconColor,
  title,
  subtitle,
}: {
  icon: typeof Flame;
  iconColor: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className={`w-8 h-8 rounded-lg ${iconColor.replace("text-", "bg-")}/12 flex items-center justify-center flex-shrink-0 border ${iconColor.replace("text-", "border-")}/15`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <h2 className="font-display font-bold text-lg text-text-primary">{title}</h2>
        {subtitle && (
          <p className="text-xs text-text-muted">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Section Separator ────────────────────────────────────────────────────────

function SectionSeparator() {
  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="h-px bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PrecoHojePage() {
  const [hotOffers, lowestPrices, recentlyImported, coupons] = await Promise.all([
    getHotOffers(12).catch(() => []),
    getLowestPrices(12).catch(() => []),
    getRecentlyImported(12).catch(() => []),
    getActiveCoupons().catch(() => []),
  ]);

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative py-10 md:py-14">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-brand-500/6 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[250px] bg-accent-purple/4 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-500/20 text-brand-600 text-xs font-semibold mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Atualizado em {today}
          </div>

          <h1 className="font-display font-extrabold text-3xl md:text-5xl text-surface-900 tracking-tight leading-[1.1]">
            Preço{" "}
            <span className="text-gradient">Hoje</span>
          </h1>

          <p className="mt-3 text-surface-500 text-base max-w-lg mx-auto">
            As melhores oportunidades do dia reunidas em um só lugar. Quedas de preço, ofertas quentes, cupons e novidades.
          </p>
        </div>
      </section>

      {/* ===== MAIORES QUEDAS ===== */}
      {lowestPrices.length > 0 && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeader
              icon={TrendingDown}
              iconColor="text-accent-blue"
              title="Maiores Quedas"
              subtitle="Produtos no menor preço histórico"
            />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {lowestPrices.map((p) => (
                <OfferCard key={p.id} product={p} page="preco-hoje" railSource="preco-hoje-quedas" />
              ))}
            </div>
          </div>
        </section>
      )}

      <SectionSeparator />

      {/* ===== OFERTAS QUENTES ===== */}
      {hotOffers.length > 0 && (
        <section className="section-alt py-6">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeader
              icon={Flame}
              iconColor="text-accent-red"
              title="Ofertas Quentes"
              subtitle="Maior score de oferta agora"
            />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {hotOffers.map((p) => (
                <OfferCard key={p.id} product={p} page="preco-hoje" railSource="preco-hoje-hot" />
              ))}
            </div>
          </div>
        </section>
      )}

      <SectionSeparator />

      {/* ===== CUPONS ATIVOS ===== */}
      {coupons.length > 0 && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-1">
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
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {coupons.map((c: any) => (
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

      {/* ===== NOVIDADES ===== */}
      {recentlyImported.length > 0 && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeader
              icon={Package}
              iconColor="text-accent-green"
              title="Novidades"
              subtitle="Produtos adicionados recentemente"
            />
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {recentlyImported.map((p) => (
                <OfferCard key={p.id} product={p} page="preco-hoje" railSource="preco-hoje-novidades" />
              ))}
            </div>
          </div>
        </section>
      )}

      <SectionSeparator />

      {/* ===== CTA ===== */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-semibold text-text-primary">Explore mais</span>
          </div>
          <p className="text-sm text-text-muted mb-5 max-w-md mx-auto">
            Descubra ainda mais oportunidades navegando pelas nossas páginas especializadas.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/ofertas"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors shadow-sm"
            >
              Todas as Ofertas
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/menor-preco"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-surface-200 text-text-primary text-sm font-semibold hover:border-brand-500/30 hover:bg-brand-50 transition-colors shadow-sm"
            >
              Menor Preço
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/mais-vendidos"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-surface-200 text-text-primary text-sm font-semibold hover:border-brand-500/30 hover:bg-brand-50 transition-colors shadow-sm"
            >
              Mais Vendidos
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
