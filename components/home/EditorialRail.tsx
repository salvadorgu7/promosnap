"use client"

import { useState, useEffect } from "react"
import { Sparkles, ArrowRight } from "lucide-react"
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

  if (loading || blocks.length === 0) return null

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/12 flex items-center justify-center border border-brand-500/15">
            <Sparkles className="w-4 h-4 text-brand-500" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">Descobrir</h2>
            <p className="text-xs text-text-muted">Paginas geradas a partir das buscas mais populares</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {blocks.slice(0, 8).map(block => {
            const slug = block.slug.replace('descobrir-', '')
            const payload = block.payloadJson as EditorialBlock['payloadJson']

            return (
              <Link
                key={block.id}
                href={`/descobrir/${slug}`}
                className="p-3 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors group"
              >
                <p className="text-sm font-medium text-text-primary line-clamp-1 group-hover:text-brand-500">
                  {block.title}
                </p>
                {block.subtitle && (
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{block.subtitle}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {payload?.productCount && (
                    <span className="text-[10px] text-text-muted">{payload.productCount} produtos</span>
                  )}
                  {payload?.isTrending && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange font-medium">
                      Em Alta
                    </span>
                  )}
                  <ArrowRight className="w-3 h-3 text-text-muted ml-auto group-hover:text-brand-500" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
