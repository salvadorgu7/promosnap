import { notFound } from "next/navigation"
import Link from "next/link"
import { BookOpen, ChevronRight, HelpCircle, Tag, Scale } from "lucide-react"
import Breadcrumb from "@/components/ui/Breadcrumb"
import InternalLinks from "@/components/seo/InternalLinks"
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata"
import { BUYING_GUIDES, BUYING_GUIDE_SLUGS } from "@/lib/seo/buying-guides"
import { COMPARISONS } from "@/lib/seo/comparisons"
import { BEST_PAGES } from "@/lib/seo/best-pages"

export const revalidate = 3600

export async function generateStaticParams() {
  return BUYING_GUIDE_SLUGS.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = BUYING_GUIDES[slug]
  if (!guide) return buildMetadata({ title: "Guia nao encontrado" })
  return buildMetadata({ title: guide.title, description: guide.description, path: `/guia-compra/${slug}` })
}

export default async function BuyingGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = BUYING_GUIDES[slug]
  if (!guide) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Guias de Compra", url: "/guias" },
          { name: guide.title, url: `/guia-compra/${slug}` },
        ])),
      }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faqs.map(faq => ({
            "@type": "Question", name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }),
      }} />

      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: "Guias", href: "/guias" },
        { label: guide.title },
      ]} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">{guide.title}</h1>
        </div>
        <p className="text-text-secondary leading-relaxed max-w-3xl">{guide.intro}</p>
      </div>

      {/* Table of Contents */}
      <nav className="mb-8 p-4 rounded-xl bg-surface-50 border border-surface-100">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Neste guia</p>
        <ol className="space-y-1.5">
          {guide.sections.map((s, i) => (
            <li key={i}>
              <a href={`#section-${i}`} className="text-sm text-accent-blue hover:underline flex items-center gap-1.5">
                <span className="text-xs text-text-muted w-5">{i + 1}.</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Sections */}
      <div className="space-y-8 mb-12">
        {guide.sections.map((s, i) => (
          <section key={i} id={`section-${i}`}>
            <h2 className="text-xl font-bold font-display text-text-primary mb-2">
              {i + 1}. {s.title}
            </h2>
            <p className="text-text-secondary leading-relaxed">{s.content}</p>
          </section>
        ))}
      </div>

      {/* Related comparisons */}
      {guide.relatedComparisons.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-accent-blue" />
            <h2 className="font-display font-bold text-lg text-text-primary">Comparativos Relacionados</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guide.relatedComparisons.map(compSlug => {
              const comp = COMPARISONS[compSlug]
              if (!comp) return null
              return (
                <Link key={compSlug} href={`/comparar/${compSlug}`}
                  className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-white hover:border-accent-blue/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-text-primary group-hover:text-accent-blue transition-colors">
                      {comp.productA.name} vs {comp.productB.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{comp.title}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-accent-blue flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Related best pages */}
      {guide.relatedBestPages.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-accent-orange" />
            <h2 className="font-display font-bold text-lg text-text-primary">Rankings Relacionados</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guide.relatedBestPages.map(bpSlug => {
              const page = BEST_PAGES[bpSlug]
              if (!page) return null
              return (
                <Link key={bpSlug} href={`/melhores/${bpSlug}`}
                  className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-white hover:border-accent-orange/30 transition-colors">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-accent-orange transition-colors">{page.title}</p>
                  <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-accent-orange flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-brand-500" />
          <h2 className="font-display font-bold text-lg text-text-primary">Perguntas Frequentes</h2>
        </div>
        <div className="space-y-3">
          {guide.faqs.map((faq, i) => (
            <details key={i} className="card group">
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-text-primary hover:text-accent-blue transition-colors list-none">
                {faq.q}
                <ChevronRight className="w-4 h-4 text-surface-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-2" />
              </summary>
              <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Internal links */}
      <InternalLinks type="melhores" currentSlug={slug} />

      {/* CTA */}
      <section className="card p-8 text-center bg-gradient-to-r from-brand-50 to-accent-blue/5">
        <h2 className="font-display font-bold text-xl text-text-primary mb-2">Pronto para comparar precos?</h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          Use o PromoSnap para encontrar o melhor preco com contexto real.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/busca" className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold">Buscar produtos</Link>
          <Link href="/ofertas" className="btn-secondary px-6 py-2.5 rounded-lg text-sm font-semibold">Ver ofertas</Link>
        </div>
      </section>
    </div>
  )
}
