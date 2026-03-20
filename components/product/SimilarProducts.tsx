import prisma from "@/lib/db/prisma"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface SimilarProductsProps {
  productId: string
  categorySlug?: string
  brandId?: string
}

export default async function SimilarProducts({ productId, categorySlug, brandId }: SimilarProductsProps) {
  if (!categorySlug) return null

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: productId },
      category: { slug: categorySlug },
      ...(brandId ? { brandId: { not: brandId } } : {}),
      imageUrl: { not: null },
      listings: {
        some: {
          status: "ACTIVE",
          offers: { some: { isActive: true, currentPrice: { gt: 0 } } },
        },
      },
    },
    include: {
      brand: { select: { name: true } },
      listings: {
        where: { status: "ACTIVE" },
        include: {
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
          },
        },
        take: 1,
      },
    },
    orderBy: { popularityScore: "desc" },
    take: 4,
  })

  if (products.length === 0) return null

  return (
    <section className="mt-6">
      <h3 className="font-display font-bold text-sm text-text-primary mb-3">
        Ja viu estes?
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {products.map(p => {
          const offer = p.listings[0]?.offers[0]
          if (!offer) return null

          return (
            <Link
              key={p.id}
              href={`/produto/${p.slug}`}
              className="p-2.5 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors group"
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-20 object-contain rounded-lg bg-white mb-2"
                  loading="lazy"
                />
              )}
              <p className="text-xs font-medium text-text-primary line-clamp-2 mb-1 group-hover:text-brand-500">
                {p.name}
              </p>
              <p className="text-sm font-bold font-display text-text-primary">
                {formatPrice(offer.currentPrice)}
              </p>
              {p.brand && (
                <p className="text-[10px] text-text-muted">{p.brand.name}</p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
