import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ChevronRight, HelpCircle, Scale, Sparkles } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import InternalLinks from "@/components/seo/InternalLinks";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByCategory, searchListings } from "@/lib/db/queries";
import { BEST_PAGES, BEST_PAGE_SLUGS } from "@/lib/seo/best-pages";
import { COMPARISON_LIST } from "@/lib/seo/comparisons";

export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  return BEST_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = BEST_PAGES[slug];
  if (!page) return buildMetadata({ title: "Página não encontrada" });

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/melhores/${slug}`,
  });
}

async function fetchProducts(query: { categories?: string[]; brands?: string[]; keywords?: string[] }) {
  // Try category-based query first
  if (query.categories?.length) {
    const { products } = await getProductsByCategory(query.categories[0], {
      limit: 16,
      sort: "score",
    });
    return products;
  }

  // Fallback to keyword search
  if (query.keywords?.length) {
    const { products } = await searchListings(query.keywords[0], { limit: 16, sort: "score" });
    return products;
  }

  return [];
}

function getRelatedComparisons(query: { categories?: string[]; brands?: string[]; keywords?: string[] }) {
  const tokens = [
    ...(query.keywords ?? []),
    ...(query.categories ?? []),
    ...(query.brands ?? []),
  ].map((t) => t.toLowerCase());

  if (tokens.length === 0) return [];

  return COMPARISON_LIST.filter((c) =>
    tokens.some(
      (t) =>
        c.productA.query.toLowerCase().includes(t) ||
        c.productB.query.toLowerCase().includes(t) ||
        c.productA.name.toLowerCase().includes(t) ||
        c.productB.name.toLowerCase().includes(t) ||
        t.includes(c.productA.query.toLowerCase()) ||
        t.includes(c.productB.query.toLowerCase())
    )
  ).slice(0, 6);
}

export default async function MelhoresPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = BEST_PAGES[slug];
  if (!page) notFound();

  const products = await fetchProducts(page.query);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Melhores", url: "/melhores" },
              { name: page.title, url: `/melhores/${slug}` },
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
          { label: "Melhores", href: "/melhores" },
          { label: page.title },
        ]}
      />

      {/* Intro section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-accent-blue" />
          </div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            {page.title}
          </h1>
        </div>
        <p className="text-text-secondary leading-relaxed max-w-3xl">
          {page.intro}
        </p>
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
              <OfferCard key={p.id} product={p} railSource="best-page" page="melhores" />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 card p-8 text-center">
          <p className="text-text-muted">
            Estamos indexando produtos para esta categoria. Volte em breve!
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

      {/* Related comparisons */}
      {(() => {
        const related = getRelatedComparisons(page.query);
        if (related.length === 0) return null;
        return (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-brand-500" />
              <h2 className="font-display font-bold text-lg text-text-primary">
                Comparações Relacionadas
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`/comparar/${c.slug}`}
                  className="group flex items-center justify-between gap-3 px-5 py-4 rounded-xl border border-surface-200 bg-white hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent-blue transition-colors truncate">
                      {c.productA.name} vs {c.productB.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5 truncate">
                      {c.title}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-400 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

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
