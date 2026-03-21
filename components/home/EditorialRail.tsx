"use client"

import { useState, useEffect } from "react"
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react"
import Link from "next/link"

interface EditorialBlock {
  id: string
  title: string
  slug: string
  subtitle: string | null
  blockType: string
  payloadJson: {
    query?: string
    productCount?: number
    isTrending?: boolean
  } | null
}

/** Static landing pages as fallback when DB has no editorial blocks */
const STATIC_PAGES = [
  { title: "Melhores Celulares até R$ 2.000", slug: "celular-ate-2000", subtitle: "Smartphones com melhor custo-benefício", trending: true },
  { title: "Melhores Notebooks até R$ 4.000", slug: "notebook-ate-4000", subtitle: "Para trabalho e estudo", trending: false },
  { title: "Melhores Fones Bluetooth", slug: "fone-bluetooth", subtitle: "Com cancelamento de ruído", trending: true },
  { title: "Melhores Smart TVs 55\"", slug: "smart-tv-55", subtitle: "4K com melhor preço", trending: false },
  { title: "Melhores Air Fryers", slug: "airfryer", subtitle: "Fritadeiras elétricas", trending: true },
  { title: "Melhores Smartwatches", slug: "smartwatch", subtitle: "Relógios inteligentes", trending: false },
  { title: "PlayStation vs Xbox", slug: "console-playstation-xbox", subtitle: "Qual console comprar?", trending: true },
  { title: "Melhores Monitores Gamer", slug: "monitor-gamer", subtitle: "144Hz+ com melhor preço", trending: false },
]

export default function EditorialRail() {
  const [blocks, setBlocks] = useState<EditorialBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/home/editorial")
      .then(r => r.ok ? r.json() : { blocks: [] })
      .then(d => setBlocks(d.blocks ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Use DB blocks if available, otherwise use static landing pages
  const hasDbBlocks = blocks.length > 0
  const items = hasDbBlocks
    ? blocks.slice(0, 8).map(block => ({
        title: block.title,
        slug: block.slug.replace('descobrir-', ''),
        subtitle: block.subtitle,
        trending: !!block.payloadJson?.isTrending,
        productCount: block.payloadJson?.productCount,
        href: `/descobrir/${block.slug.replace('descobrir-', '')}`,
      }))
    : STATIC_PAGES.map(p => ({
        title: p.title,
        slug: p.slug,
        subtitle: p.subtitle,
        trending: p.trending,
        productCount: undefined,
        href: `/melhor/${p.slug}`,
      }))

  if (loading) return null

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/12 flex items-center justify-center border border-brand-500/15">
            <Sparkles className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">Descobrir</h2>
            <p className="text-xs text-text-muted">As melhores ofertas por categoria</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {items.map(item => (
            <Link
              key={item.slug}
              href={item.href}
              className="p-3 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 hover:border-brand-500/30 transition-colors group"
            >
              <p className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-brand-500">
                {item.title}
              </p>
              {item.subtitle && (
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{item.subtitle}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                {item.productCount && (
                  <span className="text-[10px] text-text-muted">{item.productCount} produtos</span>
                )}
                {item.trending && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange font-medium">
                    <TrendingUp className="w-2.5 h-2.5" />
                    Em Alta
                  </span>
                )}
                <ArrowRight className="w-3 h-3 text-text-muted ml-auto group-hover:text-brand-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
