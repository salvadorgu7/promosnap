import Link from "next/link";
import { Award, Truck, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import DealOfTheDayWrapper from "./DealOfTheDayWrapper";

interface Props {
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    sourceName: string;
    offerScore: number;
    isFreeShipping: boolean;
  };
}

export default function DealOfTheDay({ product }: Props) {
  const scoreClass =
    product.offerScore >= 75
      ? "score-high"
      : product.offerScore >= 50
        ? "score-mid"
        : "score-low";

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 via-primary-700 to-primary-900 shadow-lg">
          <div className="p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Award className="w-5 h-5 text-accent-yellow" />
              </div>
              <div>
                <h2 className="font-display font-bold text-lg text-white">
                  Oferta do Dia
                </h2>
                <p className="text-xs text-white/60">Selecionada pelo nosso algoritmo</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
              {/* Image */}
              <Link
                href={`/produto/${product.slug}`}
                className="w-full md:w-64 flex-shrink-0"
              >
                <div className="relative aspect-square rounded-xl bg-white/10 backdrop-blur overflow-hidden">
                  <ImageWithFallback
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-contain p-6 hover:scale-105 transition-transform duration-500"
                    width={300}
                    height={300}
                  />
                  {product.discount && product.discount >= 30 && (
                    <div className="absolute top-3 left-3 bg-accent-red text-white text-xs font-bold px-2 py-1 rounded">
                      -{product.discount}%
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 text-white">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`score-pill ${scoreClass}`}>
                    {Math.round(product.offerScore)}
                  </span>
                  <span className="text-xs text-white/60">{product.sourceName}</span>
                  {product.isFreeShipping && (
                    <span className="flex items-center gap-1 text-xs text-accent-green">
                      <Truck className="w-3.5 h-3.5" /> Frete gratis
                    </span>
                  )}
                </div>

                <Link href={`/produto/${product.slug}`}>
                  <h3 className="font-display font-bold text-xl md:text-2xl leading-tight hover:text-accent-yellow transition-colors">
                    {product.name}
                  </h3>
                </Link>

                {/* Price */}
                <div className="mt-4">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-white/50 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                      {product.discount && product.discount > 0 && (
                        <span className="text-sm font-bold text-accent-green">
                          -{product.discount}%
                        </span>
                      )}
                    </div>
                  )}
                  <div className="font-display font-extrabold text-3xl md:text-4xl text-accent-yellow">
                    {formatPrice(product.price)}
                  </div>
                  {product.price > 100 && (
                    <p className="text-xs text-white/50 mt-1">
                      ou 12x de {formatPrice(product.price / 12)}
                    </p>
                  )}
                </div>

                {/* Countdown + CTA */}
                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Link
                    href={`/produto/${product.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-yellow text-surface-900 font-display font-bold text-sm hover:bg-yellow-300 transition-colors shadow-lg"
                  >
                    Ver Oferta
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <DealOfTheDayWrapper />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
