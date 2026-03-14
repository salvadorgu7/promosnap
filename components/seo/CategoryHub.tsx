import Link from "next/link"
import { BookOpen, Scale, Award, ChevronRight } from "lucide-react"
import { COMPARISON_LIST } from "@/lib/seo/comparisons"
import { BEST_PAGES, BEST_PAGE_SLUGS } from "@/lib/seo/best-pages"
import { BUYING_GUIDES, BUYING_GUIDE_SLUGS } from "@/lib/seo/buying-guides"

interface CategoryHubProps {
  categorySlug: string
  categoryName: string
}

export default function CategoryHub({ categorySlug, categoryName }: CategoryHubProps) {
  // Find related content
  const comparisons = COMPARISON_LIST.filter(c =>
    c.productA.query.toLowerCase().includes(categorySlug) ||
    c.productB.query.toLowerCase().includes(categorySlug) ||
    c.productA.name.toLowerCase().includes(categorySlug.replace(/-/g, ' '))
  ).slice(0, 4)

  const bestPages = BEST_PAGE_SLUGS.filter(slug => {
    const page = BEST_PAGES[slug]
    return page?.query.categories?.includes(categorySlug) ||
      page?.query.keywords?.some(k => k.toLowerCase().includes(categorySlug.replace(/-/g, ' ')))
  }).slice(0, 3)

  const guides = BUYING_GUIDE_SLUGS.filter(slug => {
    const guide = BUYING_GUIDES[slug]
    return guide?.relatedCategories.includes(categorySlug)
  }).slice(0, 2)

  const hasContent = comparisons.length > 0 || bestPages.length > 0 || guides.length > 0
  if (!hasContent) return null

  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-lg text-text-primary mb-4">
        Mais sobre {categoryName}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {guides.map(guideSlug => {
          const guide = BUYING_GUIDES[guideSlug]
          if (!guide) return null
          return (
            <Link key={guideSlug} href={`/guia-compra/${guideSlug}`}
              className="group flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-brand-500/30 transition-colors">
              <BookOpen className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-brand-500">Guia de Compra</p>
                <p className="text-sm text-text-primary truncate group-hover:text-brand-500">{guide.title}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-surface-300" />
            </Link>
          )
        })}
        {comparisons.map(c => (
          <Link key={c.slug} href={`/comparar/${c.slug}`}
            className="group flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-accent-blue/30 transition-colors">
            <Scale className="w-4 h-4 text-accent-blue flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-accent-blue">Comparativo</p>
              <p className="text-sm text-text-primary truncate group-hover:text-accent-blue">{c.productA.name} vs {c.productB.name}</p>
            </div>
            <ChevronRight className="w-3 h-3 text-surface-300" />
          </Link>
        ))}
        {bestPages.map(bpSlug => {
          const page = BEST_PAGES[bpSlug]
          if (!page) return null
          return (
            <Link key={bpSlug} href={`/melhores/${bpSlug}`}
              className="group flex items-center gap-3 p-3 rounded-xl border border-surface-200 hover:border-accent-orange/30 transition-colors">
              <Award className="w-4 h-4 text-accent-orange flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-accent-orange">Ranking</p>
                <p className="text-sm text-text-primary truncate group-hover:text-accent-orange">{page.title}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-surface-300" />
            </Link>
          )
        })}
      </div>
    </section>
  )
}
