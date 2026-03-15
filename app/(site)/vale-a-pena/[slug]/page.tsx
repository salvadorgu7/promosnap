import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  ChevronRight,
  HelpCircle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Scale,
  CheckCircle,
} from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import InternalLinks from "@/components/seo/InternalLinks";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { searchListings } from "@/lib/db/queries";
import { VALE_A_PENA_PAGES, VALE_A_PENA_SLUGS } from "@/lib/seo/vale-a-pena";

export const revalidate = 3600;

export async function generateStaticParams() {
  return VALE_A_PENA_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = VALE_A_PENA_PAGES[slug];
  if (!page) return buildMetadata({ title: "Página não encontrada" });

  // Ensure title includes year context: "Vale a Pena Comprar X em 2026?"
  const seoTitle = page.title.includes("2026")
    ? page.title
    : page.title.replace(/\?$/, "") + " em 2026?";

  return buildMetadata({
    title: seoTitle.endsWith("?") ? seoTitle : seoTitle,
    description: page.description,
    path: `/vale-a-pena/${slug}`,
  });
}

export default async function ValeAPenaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = VALE_A_PENA_PAGES[slug];
  if (!page) notFound();

  // Fetch main products
  const { products } = await searchListings(page.productQuery, {
    limit: 6,
    sort: "score",
  });

  // Fetch alternative products
  const alternativeResults = await Promise.all(
    page.alternativeQueries.map((q) =>
      searchListings(q, { limit: 4, sort: "score" })
    )
  );
  const alternativeProducts = alternativeResults
    .flatMap((r) => r.products)
    .filter(
      (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
    )
    .slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Vale a Pena?", url: "/vale-a-pena" },
              { name: page.title, url: `/vale-a-pena/${slug}` },
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
          { label: "Vale a Pena?", href: "/vale-a-pena" },
          { label: page.title },
        ]}
      />

      {/* Hero section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-semibold">
            <Scale className="w-3.5 h-3.5" />
            Análise de Compra
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-accent-blue" />
          </div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            {page.title.includes("2026")
              ? page.title
              : page.title.replace(/\?$/, "") + " em 2026?"}
          </h1>
        </div>
        <p className="text-text-secondary leading-relaxed max-w-3xl">
          {page.intro}
        </p>
      </div>

      {/* Main product grid */}
      {products.length > 0 ? (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-bold text-lg text-text-primary">
              Melhores Ofertas
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <OfferCard
                key={p.id}
                product={p}
                railSource="vale-a-pena"
                page="vale-a-pena"
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 card p-8 text-center">
          <p className="text-text-muted">
            Estamos buscando as melhores ofertas para este produto. Volte em
            breve!
          </p>
        </div>
      )}

      {/* Pros and Cons */}
      <section className="mb-12">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Pros */}
            <div className="p-6 md:border-r border-surface-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
                  <ThumbsUp className="w-4 h-4 text-accent-green" />
                </div>
                <h3 className="font-display font-bold text-text-primary">
                  Pontos Positivos
                </h3>
              </div>
              <ul className="space-y-3">
                {page.pros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0" />
                    <span className="text-sm text-text-secondary leading-relaxed">
                      {pro}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons */}
            <div className="p-6 border-t md:border-t-0 border-surface-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent-red/10 flex items-center justify-center">
                  <ThumbsDown className="w-4 h-4 text-accent-red" />
                </div>
                <h3 className="font-display font-bold text-text-primary">
                  Pontos de Atenção
                </h3>
              </div>
              <ul className="space-y-3">
                {page.cons.map((con, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0" />
                    <span className="text-sm text-text-secondary leading-relaxed">
                      {con}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="mb-12">
        <div className="card p-6 bg-gradient-to-r from-accent-green/5 to-accent-blue/5 border-accent-green/20">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-accent-green" />
            </div>
            <h2 className="font-display font-bold text-lg text-text-primary">
              Nosso Veredito
            </h2>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed max-w-3xl">
            {page.verdict}
          </p>
        </div>
      </section>

      {/* Alternatives */}
      {alternativeProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-brand-500" />
            <h2 className="font-display font-bold text-lg text-text-primary">
              Alternativas para Considerar
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {alternativeProducts.map((p) => (
              <OfferCard
                key={p.id}
                product={p}
                railSource="vale-a-pena"
                page="vale-a-pena"
              />
            ))}
          </div>
        </section>
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
            <details key={i} className="card group">
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
          Ainda em dúvida?
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          Compare preços em tempo real e encontre a melhor oferta para o produto
          que você procura.
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
