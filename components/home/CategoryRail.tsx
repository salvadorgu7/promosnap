import { ChevronRight } from "lucide-react";
import Link from "next/link";
import OfferCard from "@/components/cards/OfferCard";
import type { ProductCard } from "@/types";

interface CategoryRailProps {
  title: string;
  slug: string;
  icon: string;
  products: ProductCard[];
}

export default function CategoryRail({ title, slug, icon, products }: CategoryRailProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <h2 className="font-display font-bold text-base text-text-primary">{title}</h2>
          </div>
          <Link
            href={`/categoria/${slug}`}
            className="flex items-center gap-1 text-xs text-accent-blue hover:text-brand-500 font-medium"
          >
            Ver todos <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rail gap-3 pb-2">
          {products.map((p) => (
            <div key={p.id} className="w-[200px] md:w-[240px] flex-shrink-0">
              <OfferCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
