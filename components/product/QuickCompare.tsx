import Link from "next/link";
import { Scale, ExternalLink, Truck, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import type { ProductCard } from "@/types";

interface QuickCompareProps {
  products: ProductCard[];
  title?: string;
}

export default function QuickCompare({ products, title = "Compare em 10 segundos" }: QuickCompareProps) {
  if (products.length < 2) return null;
  const items = products.slice(0, 3);
  const bestPrice = Math.min(...items.map(p => p.bestOffer.price));

  return (
    <div className="card p-4 bg-gradient-to-r from-brand-50/50 to-accent-blue/5 border-brand-500/15">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-bold font-display text-text-primary">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((p) => {
          const isBest = p.bestOffer.price === bestPrice;
          return (
            <div key={p.id} className={`relative rounded-xl border p-3 bg-white ${isBest ? "border-accent-green/40 ring-1 ring-accent-green/20" : "border-surface-200"}`}>
              {isBest && (
                <span className="absolute -top-2 left-3 px-2 py-0.5 bg-accent-green text-white text-[9px] font-bold uppercase rounded-full">
                  Melhor Preco
                </span>
              )}
              <Link href={`/produto/${p.slug}`} className="block">
                <div className="aspect-square rounded-lg overflow-hidden image-container mb-2">
                  <ImageWithFallback
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-contain p-2"
                    width={150}
                    height={150}
                  />
                </div>
                <h4 className="text-[11px] font-medium text-text-primary line-clamp-2 leading-snug mb-1">
                  {p.name}
                </h4>
              </Link>
              <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                <span className="text-[10px] text-text-muted">{p.bestOffer.sourceName}</span>
                {p.bestOffer.isFreeShipping && (
                  <Truck className="h-2.5 w-2.5 text-accent-purple" />
                )}
                {p.bestOffer.offerScore >= 70 && (
                  <ShieldCheck className="h-2.5 w-2.5 text-accent-green" />
                )}
              </div>
              <div className="font-display font-bold text-base text-text-primary">
                {formatPrice(p.bestOffer.price)}
              </div>
              {p.bestOffer.discount && p.bestOffer.discount > 0 && (
                <span className="text-[10px] font-semibold text-accent-green">-{p.bestOffer.discount}%</span>
              )}
              {p.bestOffer.offerId && p.bestOffer.affiliateUrl && p.bestOffer.affiliateUrl !== "#" && (
                <a
                  href={`/api/clickout/${p.bestOffer.offerId}?page=compare&origin=quick-compare`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[11px] font-semibold btn-primary"
                >
                  Ver Oferta <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
