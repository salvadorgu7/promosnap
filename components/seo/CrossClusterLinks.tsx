import Link from "next/link"
import { Compass, ArrowRight } from "lucide-react"
import { getCrossLinksForCategory } from "@/lib/seo/link-optimizer"

interface CrossClusterLinksProps {
  categorySlug?: string
  clusterId?: string
}

export default function CrossClusterLinks({ categorySlug, clusterId }: CrossClusterLinksProps) {
  let links: Array<{ href: string; label: string }> = []

  if (categorySlug) {
    links = getCrossLinksForCategory(categorySlug)
  } else if (clusterId) {
    // Import directly if needed
    const { getClusterCrossLinks } = require("@/lib/seo/link-optimizer")
    links = getClusterCrossLinks(clusterId)
  }

  if (links.length === 0) return null

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3">
        <Compass className="w-4 h-4 text-brand-500" />
        Explore Tambem
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className="flex items-center gap-2 p-3 rounded-lg border border-surface-200 bg-surface-50 hover:bg-surface-100 text-sm text-text-primary hover:text-brand-500 transition-colors group"
          >
            <span className="flex-1 line-clamp-1">{link.label}</span>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </section>
  )
}
