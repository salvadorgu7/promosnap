import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import InternalLinks from "@/components/seo/InternalLinks";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { searchListings } from "@/lib/db/queries";
import { OFFER_PAGES, OFFER_PAGE_SLUGS } from "@/lib/seo/offer-pages";

export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  return OFFER_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = OFFER_PAGES[slug];
  if (!page) return buildMetadata({ title: "Página não encontrada" });

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/ofertas/${slug}`,
  });
}

export default async function OfertaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = OFFER_PAGES[slug];
  if (!page) notFound();

  const { products, total } = await searchListings(page.searchQuery, {
    limit: 20,
    sort: "score",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Ofertas", url: "/ofertas" },
              { name: page.title, url: `/ofertas/${slug}` },
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
          { label: "Ofertas", href: "/ofertas" },
          { label: page.title },
        ]}
      />

      {/* Intro section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-orange/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-accent-orange" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display text-text-primary">
              {page.title}
            </h1>
            {total > 0 && (
              <p className="text-sm text-text-muted mt-0.5">
                {total} produto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
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
              Melhores Ofertas
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} railSource="offer-page" page="offer" />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 card p-8 text-center">
          <p className="text-text-muted">
            Estamos buscando ofertas para esta categoria. Volte em breve!
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
      <InternalLinks type="ofertas" currentSlug={slug} />

      {/* CTA section */}
      <section className="card p-8 text-center bg-gradient-to-r from-accent-orange/5 to-accent-red/5">
        <h2 className="font-display font-bold text-xl text-text-primary mb-2">
          Quer mais ofertas?
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          Busque qualquer produto e compare preços em dezenas de lojas em tempo real.
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
            Todas as ofertas
          </Link>
        </div>
      </section>
    </div>
  );
}
