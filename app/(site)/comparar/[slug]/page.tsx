import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Award, ChevronDown, ExternalLink, Scale, Truck, Star, Package, Trophy, Zap } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import ComparisonTracker from "@/components/seo/ComparisonTracker";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";
import { COMPARISONS, COMPARISON_SLUGS } from "@/lib/seo/comparisons";
import type { ComparisonDef } from "@/lib/seo/comparisons";
import { BEST_PAGES, BEST_PAGE_SLUGS } from "@/lib/seo/best-pages";
import type { ProductCard } from "@/types";
import prisma from "@/lib/db/prisma";
import { formatPrice } from "@/lib/utils";
import { buildClickoutUrl } from "@/lib/clickout/build-url";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return COMPARISON_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const def = COMPARISONS[slug];
  if (!def) return buildMetadata({ title: "Comparativo" });

  // Build SEO title: "ProductA vs ProductB: Qual Comprar em 2026? | PromoSnap"
  const seoTitle = `${def.productA.name} vs ${def.productB.name}: Qual Comprar em 2026?`;

  return buildMetadata({
    title: seoTitle,
    description: def.description,
    path: `/comparar/${slug}`,
  });
}

async function searchProducts(query: string, limit = 8): Promise<ProductCard[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        name: { contains: query, mode: "insensitive" },
        listings: { some: { offers: { some: { isActive: true } } } },
      },
      include: PRODUCT_INCLUDE,
      take: limit,
      orderBy: { popularityScore: "desc" },
    });
    return products.map(buildProductCard).filter(Boolean) as ProductCard[];
  } catch (err) {
    console.error("[comparar] DB fetch failed, rendering empty state:", err);
    return [];
  }
}

function faqPageSchema(def: ComparisonDef) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: def.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

function comparisonProductSchema(
  product: { name: string; query: string },
  offers: ProductCard[],
  slug: string
) {
  const best = offers[0];
  if (!best) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: best.imageUrl || undefined,
    description: `Compare preços de ${product.name} nas melhores lojas do Brasil.`,
    offers:
      offers.length === 1
        ? {
            "@type": "Offer",
            price: best.bestOffer.price,
            priceCurrency: "BRL",
            url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"}/comparar/${slug}`,
            availability: "https://schema.org/InStock",
          }
        : {
            "@type": "AggregateOffer",
            lowPrice: Math.min(...offers.map((o) => o.bestOffer.price)),
            highPrice: Math.max(...offers.map((o) => o.bestOffer.price)),
            priceCurrency: "BRL",
            offerCount: offers.reduce((acc, o) => acc + o.offersCount, 0),
          },
  };
}

function ComparisonRow({
  label,
  valueA,
  valueB,
  highlight,
}: {
  label: string;
  valueA: string;
  valueB: string;
  highlight?: "a" | "b" | null;
}) {
  return (
    <tr className="border-b border-surface-100 last:border-0">
      <td className="py-3 px-4 text-sm font-medium text-text-secondary bg-surface-50 w-1/4">
        {label}
      </td>
      <td
        className={`py-3 px-4 text-sm text-center ${
          highlight === "a" ? "text-accent-green font-semibold" : "text-text-primary"
        }`}
      >
        {valueA}
      </td>
      <td
        className={`py-3 px-4 text-sm text-center ${
          highlight === "b" ? "text-accent-green font-semibold" : "text-text-primary"
        }`}
      >
        {valueB}
      </td>
    </tr>
  );
}

function FAQAccordion({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <details
          key={i}
          className="group rounded-xl border border-surface-200 bg-white overflow-hidden"
        >
          <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-text-primary hover:bg-surface-50 transition-colors">
            {faq.q}
            <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 ml-2 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">
            {faq.a}
          </div>
        </details>
      ))}
    </div>
  );
}

function ProductSideCard({
  label,
  products,
  slug,
}: {
  label: string;
  products: ProductCard[];
  slug: string;
}) {
  const best = products[0];
  if (!best) {
    return (
      <div className="flex-1 rounded-xl border border-surface-200 bg-white p-5">
        <h3 className="text-lg font-bold font-display text-text-primary mb-2">
          {label}
        </h3>
        <p className="text-sm text-text-muted">
          Nenhuma oferta encontrada no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 rounded-xl border border-surface-200 bg-white p-5">
      <h3 className="text-lg font-bold font-display text-text-primary mb-3">
        {label}
      </h3>
      <div className="space-y-2 mb-4">
        <p className="text-2xl font-bold text-brand-600">
          {formatPrice(best.bestOffer.price)}
        </p>
        {best.bestOffer.originalPrice && best.bestOffer.originalPrice > best.bestOffer.price && (
          <p className="text-sm text-text-muted line-through">
            {formatPrice(best.bestOffer.originalPrice)}
          </p>
        )}
        {best.bestOffer.discount && best.bestOffer.discount > 0 && (
          <span className="discount-tag text-xs">-{best.bestOffer.discount}%</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
        <Package className="w-3.5 h-3.5" />
        <span>{best.bestOffer.sourceName}</span>
        {best.bestOffer.isFreeShipping && (
          <span className="flex items-center gap-0.5 text-accent-green">
            <Truck className="w-3 h-3" /> Frete Grátis
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
        <Star className="w-3.5 h-3.5" />
        <span>Score: {Math.round(best.bestOffer.offerScore)}/100</span>
        {best.storesCount > 1 && (
          <span>em {best.storesCount} lojas</span>
        )}
        {best.storesCount <= 1 && best.offersCount > 1 && (
          <span>{best.offersCount} ofertas</span>
        )}
      </div>
      <a
        href={buildClickoutUrl({
          offerId: best.bestOffer.offerId,
          page: "compare",
          block: "quick-compare",
          recommendation: "best-price",
          product: slug,
          label: "Ver melhor oferta",
        })}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-lg
                   bg-gradient-to-r from-accent-blue to-brand-500 text-white
                   text-sm font-bold hover:shadow-glow hover:scale-[1.02] transition-all shadow-md"
      >
        Ver melhor oferta
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

function getRelatedMelhores(def: ComparisonDef) {
  const queries = [
    def.productA.query.toLowerCase(),
    def.productB.query.toLowerCase(),
    def.productA.name.toLowerCase(),
    def.productB.name.toLowerCase(),
  ];

  return BEST_PAGE_SLUGS.filter((slug) => {
    const bp = BEST_PAGES[slug];
    const tokens = [
      ...(bp.query.keywords ?? []),
      ...(bp.query.categories ?? []),
      ...(bp.query.brands ?? []),
    ].map((t) => t.toLowerCase());

    return tokens.some(
      (t) =>
        queries.some((q) => q.includes(t) || t.includes(q))
    );
  })
    .slice(0, 6)
    .map((slug) => ({ slug, title: BEST_PAGES[slug].title }));
}

export default async function CompararPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let def = COMPARISONS[slug];

  // Dynamic comparison: if slug contains "-vs-", extract two product slugs
  if (!def && slug.includes('-vs-')) {
    const parts = slug.split('-vs-')
    if (parts.length === 2) {
      const [slugA, slugB] = parts
      const nameA = slugA.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      const nameB = slugB.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      def = {
        slug,
        title: `${nameA} vs ${nameB}`,
        description: `Compare ${nameA} e ${nameB} — preços, especificações e qual vale mais a pena.`,
        productA: { name: nameA, query: slugA.replace(/-/g, ' ') },
        productB: { name: nameB, query: slugB.replace(/-/g, ' ') },
        intro: `Compare ${nameA} e ${nameB} com preços atualizados e descubra qual vale mais a pena.`,
        verdict: '',
        faqs: [
          { q: `Qual é melhor: ${nameA} ou ${nameB}?`, a: `Compare preços e especificações no PromoSnap para decidir qual vale mais a pena para o seu uso.` },
          { q: `Onde comprar mais barato?`, a: `O PromoSnap compara preços entre Amazon, Mercado Livre, Shopee, Magazine Luiza e Shein para encontrar o menor preço.` },
        ],
      }
    }
  }

  if (!def) notFound();

  const [productsA, productsB] = await Promise.all([
    searchProducts(def.productA.query),
    searchProducts(def.productB.query),
  ]);

  const bestA = productsA[0];
  const bestB = productsB[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ComparisonTracker slug={slug} title={def.title} />

      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Comparar", url: "/comparar" },
              { name: def.title, url: `/comparar/${slug}` },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageSchema(def)),
        }}
      />
      {/* Product schema for Product A */}
      {(() => {
        const schema = comparisonProductSchema(def.productA, productsA, slug);
        if (!schema) return null;
        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        );
      })()}
      {/* Product schema for Product B */}
      {(() => {
        const schema = comparisonProductSchema(def.productB, productsB, slug);
        if (!schema) return null;
        return (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        );
      })()}

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Comparar", href: "/" },
          { label: def.title },
        ]}
      />

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold mb-4">
          <Scale className="w-3.5 h-3.5" />
          Comparativo PromoSnap
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-display text-text-primary mb-4">
          {def.title}
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto leading-relaxed">
          {def.intro}
        </p>
      </div>

      {/* Conclusao Rapida — quick decision summary */}
      {bestA && bestB && (
        <div className="rounded-xl border-2 border-accent-orange/30 bg-gradient-to-r from-accent-orange/5 to-amber-50 p-5 md:p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-accent-orange" />
            <h2 className="text-lg font-bold font-display text-text-primary">
              Conclusão Rápida
            </h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed mb-4">
            {bestA.bestOffer.price <= bestB.bestOffer.price ? (
              <>
                O <strong>{def.productA.name}</strong> está mais barato agora por{" "}
                <strong className="text-accent-green">{formatPrice(bestA.bestOffer.price)}</strong>
                {bestB.bestOffer.price > bestA.bestOffer.price && (
                  <>, economizando{" "}
                  <strong>{formatPrice(bestB.bestOffer.price - bestA.bestOffer.price)}</strong> em relação ao {def.productB.name}</>
                )}.
              </>
            ) : (
              <>
                O <strong>{def.productB.name}</strong> está mais barato agora por{" "}
                <strong className="text-accent-green">{formatPrice(bestB.bestOffer.price)}</strong>
                {bestA.bestOffer.price > bestB.bestOffer.price && (
                  <>, economizando{" "}
                  <strong>{formatPrice(bestA.bestOffer.price - bestB.bestOffer.price)}</strong> em relação ao {def.productA.name}</>
                )}.
              </>
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={buildClickoutUrl({
                offerId: bestA.bestOffer.price <= bestB.bestOffer.price ? bestA.bestOffer.offerId : bestB.bestOffer.offerId,
                page: "compare",
                block: "hero",
                recommendation: "best-price",
                product: slug,
                label: "Conclusao Rapida",
              })}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                         bg-accent-orange text-white text-sm font-bold hover:bg-accent-orange/90 transition-all shadow-md"
            >
              <Trophy className="w-4 h-4" />
              Ver melhor preço ({formatPrice(Math.min(bestA.bestOffer.price, bestB.bestOffer.price))})
            </a>
          </div>
        </div>
      )}

      {/* Side-by-side cards */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="flex-1 relative">
          {bestA && bestB && bestA.bestOffer.price <= bestB.bestOffer.price && (
            <div className="absolute -top-3 left-4 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-accent-green text-white text-xs font-bold shadow-md">
              <Trophy className="w-3 h-3" /> Melhor Preço
            </div>
          )}
          <ProductSideCard label={def.productA.name} products={productsA} slug={slug} />
        </div>
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center text-text-muted font-bold text-sm">
            VS
          </div>
        </div>
        <div className="flex-1 relative">
          {bestA && bestB && bestB.bestOffer.price < bestA.bestOffer.price && (
            <div className="absolute -top-3 left-4 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-accent-green text-white text-xs font-bold shadow-md">
              <Trophy className="w-3 h-3" /> Melhor Preço
            </div>
          )}
          <ProductSideCard label={def.productB.name} products={productsB} slug={slug} />
        </div>
      </div>

      {/* Specs comparison table */}
      {bestA && bestB && (
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden mb-10">
          <div className="px-5 py-4 border-b border-surface-100 bg-surface-50">
            <h2 className="text-lg font-bold font-display text-text-primary">
              Tabela Comparativa
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="py-3 px-4 text-left text-xs font-semibold text-text-muted uppercase tracking-wider w-1/4">
                  Aspecto
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {def.productA.name}
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {def.productB.name}
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow
                label="Melhor Preço"
                valueA={formatPrice(bestA.bestOffer.price)}
                valueB={formatPrice(bestB.bestOffer.price)}
                highlight={bestA.bestOffer.price <= bestB.bestOffer.price ? "a" : "b"}
              />
              <ComparisonRow
                label="Loja"
                valueA={bestA.bestOffer.sourceName}
                valueB={bestB.bestOffer.sourceName}
              />
              <ComparisonRow
                label="Score"
                valueA={`${Math.round(bestA.bestOffer.offerScore)}/100`}
                valueB={`${Math.round(bestB.bestOffer.offerScore)}/100`}
                highlight={bestA.bestOffer.offerScore >= bestB.bestOffer.offerScore ? "a" : "b"}
              />
              <ComparisonRow
                label="Frete Grátis"
                valueA={bestA.bestOffer.isFreeShipping ? "Sim" : "Não"}
                valueB={bestB.bestOffer.isFreeShipping ? "Sim" : "Não"}
                highlight={
                  bestA.bestOffer.isFreeShipping && !bestB.bestOffer.isFreeShipping
                    ? "a"
                    : !bestA.bestOffer.isFreeShipping && bestB.bestOffer.isFreeShipping
                    ? "b"
                    : null
                }
              />
              <ComparisonRow
                label="Desconto"
                valueA={bestA.bestOffer.discount ? `${bestA.bestOffer.discount}%` : "—"}
                valueB={bestB.bestOffer.discount ? `${bestB.bestOffer.discount}%` : "—"}
                highlight={
                  (bestA.bestOffer.discount || 0) > (bestB.bestOffer.discount || 0) ? "a" :
                  (bestB.bestOffer.discount || 0) > (bestA.bestOffer.discount || 0) ? "b" : null
                }
              />
              <ComparisonRow
                label="Ofertas Disponíveis"
                valueA={`${productsA.reduce((acc, p) => acc + p.offersCount, 0)} ofertas`}
                valueB={`${productsB.reduce((acc, p) => acc + p.offersCount, 0)} ofertas`}
              />
            </tbody>
          </table>
        </div>
      )}

      {/* Verdict */}
      <div className="rounded-xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 md:p-8 mb-10">
        <h2 className="text-xl font-bold font-display text-text-primary mb-3 flex items-center gap-2">
          <Scale className="w-5 h-5 text-brand-500" />
          Veredito PromoSnap
        </h2>
        <p className="text-text-secondary leading-relaxed">{def.verdict}</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {bestA && (
            <a
              href={buildClickoutUrl({
                offerId: bestA.bestOffer.offerId,
                page: "compare",
                block: "recommendation",
                recommendation: "best-overall",
                product: slug,
                label: "Veredito A",
              })}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg
                         bg-gradient-to-r from-accent-blue to-brand-500 text-white
                         text-sm font-semibold hover:shadow-glow transition-all"
            >
              Ver {def.productA.name}
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
          {bestB && (
            <a
              href={buildClickoutUrl({
                offerId: bestB.bestOffer.offerId,
                page: "compare",
                block: "recommendation",
                recommendation: "best-overall",
                product: slug,
                label: "Veredito B",
              })}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg
                         bg-gradient-to-r from-accent-green to-emerald-500 text-white
                         text-sm font-semibold hover:shadow-glow transition-all"
            >
              Ver {def.productB.name}
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-10">
        <h2 className="text-xl font-bold font-display text-text-primary mb-4">
          Perguntas Frequentes
        </h2>
        <FAQAccordion faqs={def.faqs} />
      </div>

      {/* Product grids */}
      {productsA.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold font-display text-text-primary mb-4">
            Melhores ofertas de {def.productA.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {productsA.slice(0, 4).map((p) => (
              <OfferCard key={p.id} product={p} railSource="comparison" page="comparar" />
            ))}
          </div>
        </div>
      )}

      {productsB.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold font-display text-text-primary mb-4">
            Melhores ofertas de {def.productB.name}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {productsB.slice(0, 4).map((p) => (
              <OfferCard key={p.id} product={p} railSource="comparison" page="comparar" />
            ))}
          </div>
        </div>
      )}

      {/* Related melhores pages */}
      {(() => {
        const related = getRelatedMelhores(def);
        if (related.length === 0) return null;
        return (
          <section className="mb-10">
            <h2 className="text-xl font-bold font-display text-text-primary mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-blue" />
              Páginas de Melhores Relacionadas
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/melhores/${item.slug}`}
                  className="group flex items-center justify-between gap-3 px-5 py-4 rounded-xl border border-surface-200 bg-white hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary group-hover:text-accent-blue transition-colors truncate">
                    {item.title}
                  </span>
                  <ArrowRight className="w-4 h-4 text-surface-400 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        );
      })()}
    </div>
  );
}
