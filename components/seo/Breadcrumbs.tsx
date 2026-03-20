import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems: BreadcrumbItem[] = [{ label: "Home", href: "/" }, ...items]

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1 text-xs text-text-muted flex-wrap">
          {allItems.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
              {item.href && i < allItems.length - 1 ? (
                <Link href={item.href} className="hover:text-brand-500 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={i === allItems.length - 1 ? "text-text-primary font-medium" : ""}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* JSON-LD BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: allItems
              .filter(item => item.href)
              .map((item, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: item.label,
                item: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"}${item.href}`,
              })),
          }),
        }}
      />
    </>
  )
}
