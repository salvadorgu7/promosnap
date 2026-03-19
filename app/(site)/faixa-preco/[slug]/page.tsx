import Link from "next/link";
import { notFound } from "next/navigation";
import { DollarSign, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import InternalLinks from "@/components/seo/InternalLinks";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByCategory, searchListings } from "@/lib/db/queries";
import { PRICE_RANGE_PAGES, PRICE_RANGE_SLUGS } from "@/lib/seo/price-range-pages";

export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  return PRICE_RANGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = PRICE_RANGE_PAGES[slug];
  if (!page) return buildMetadata({ title: "Página não encontrada" });

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/faixa-preco/${slug}`,
  });
}

export default async function FaixaPrecoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = PRICE_RANGE_PAGES[slug];
  if (!page) notFound();

  // Fetch products by category
  let products: Awaited<ReturnType<typeof getProductsByCategory>>["products"] = [];
  try {
    const { products: allProducts } = await getProductsByCategory(page.categorySlug, {
      limit: 16,
      sort: "score",
    });

    // For "casa" category, also search by keyword to supplement results
    let supplementary: typeof allProducts = [];
    if (page.categorySlug === "casa") {
      const { products: keywordProducts } = await searchListings("air fryer", {
        limit: 16,
        sort: "score",
      });
      supplementary = keywordProducts;
    }

    // Merge and deduplicate
    const merged = [...allProducts];
    for (const p of supplementary) {
      if (!merged.some((m) => m.id === p.id)) {
        merged.push(p);
      }
    }

    // Filter by max price
    products = merged.filter(
      (p) => p.bestOffer.price <= page.maxPrice
    );
  } catch (err) {
    console.error("[faixa-preco] DB fetch failed, rendering empty state:", err);
  }

  const formattedPrice = page.maxPrice.toLocaleString("pt-BR");

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Faixa de Preço", url: "/faixa-preco" },
              { name: page.title, url: `/faixa-preco/${slug}` },
            ])
          ),
        }}
      />

      {/* FAQ schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Faixa de Preço", href: "/faixa-preco" },
          { label: page.title },
        ]}
      />

      {/* Hero section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-accent-blue" />
          </div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            {page.title}
          </h1>
        </div>
        <p className="text-text-secondary leading-relaxed max-w-3xl">
          {page.intro}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue/10 text-accent-blue font-semibold text-sm">
          <DollarSign className="w-4 h-4" />
          Até R$ {formattedPrice}
        </div>
      </div>

      {/* Product grid */}
      {products.length > 0 ? (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-bold text-lg text-text-primary">
              Top Ofertas
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} railSource="faixa-preco" page="faixa-preco" />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 card p-8 text-center">
          <p className="text-text-muted">
            Estamos indexando produtos para esta faixa de preço. Volte em breve!
          </p>
        </div>
      )}

      {/* FAQ section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-brand-500" />
          <h2 className="font-display font-bold text-lg text-text-primary">
            Perguntas Frequentes
          </h2>
        </div>
        <div className="space-y-4 max-w-3xl">
          {page.faqs.map((faq, i) => (
            <details
              key={i}
              className="card group"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-text-primary hover:text-accent-blue transition-colors list-none">
                {faq.q}
                <ChevronRight className="w-4 h-4 text-surface-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-2" />
              </summary>
              <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Internal links */}
      <InternalLinks type="melhores" currentSlug={slug} />

      {/* CTA section */}
      <section className="card p-8 text-center bg-gradient-to-r from-accent-blue/5 to-brand-500/5">
        <h2 className="font-display font-bold text-xl text-text-primary mb-2">
          Não encontrou o que procurava?
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          Use nossa busca para encontrar qualquer produto com preço comparado em
          tempo real.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/busca"
            className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Buscar produtos
          </Link>
          <Link
            href="/ofertas"
            className="btn-secondary px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Ver todas as ofertas
          </Link>
        </div>
      </section>
    </div>
  );
}
