"use client";

import { ExternalLink, ShieldCheck, Truck, CreditCard } from "lucide-react";

interface CommercialCTAProps {
  affiliateUrl: string;
  offerId: string;
  price: number;
  originalPrice?: number;
  sourceName: string;
  sourceSlug: string;
  freeShipping?: boolean;
  installments?: string;
  productSlug?: string;
}

export default function CommercialCTA({
  affiliateUrl,
  offerId,
  price,
  originalPrice,
  sourceName,
  sourceSlug,
  freeShipping,
  installments,
  productSlug,
}: CommercialCTAProps) {
  const discount = originalPrice && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const clickoutUrl = `/api/clickout/${offerId}?page=product&product=${productSlug || ""}&origin=commercial_cta`;

  return (
    <div className="rounded-xl border-2 border-accent-green/30 bg-gradient-to-b from-green-50/50 to-white p-4">
      {/* Price */}
      <div className="mb-3">
        {discount > 0 && originalPrice && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-text-muted line-through">
              R$ {originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-accent-green bg-green-50 px-1.5 py-0.5 rounded">
              -{discount}%
            </span>
          </div>
        )}
        <p className="text-2xl font-bold font-display text-text-primary">
          R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        {installments && (
          <p className="text-xs text-text-muted mt-0.5">
            <CreditCard className="w-3 h-3 inline mr-1" />
            {installments}
          </p>
        )}
      </div>

      {/* Trust signals */}
      <div className="flex flex-wrap gap-2 mb-3">
        {freeShipping && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-accent-blue">
            <Truck className="w-3 h-3" />
            Frete gratis
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-accent-green">
          <ShieldCheck className="w-3 h-3" />
          Loja oficial
        </span>
      </div>

      {/* CTA Button */}
      <a
        href={clickoutUrl}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-accent-green text-white text-sm font-bold hover:bg-green-600 transition-colors shadow-sm"
      >
        <ExternalLink className="w-4 h-4" />
        Ver na {sourceName}
      </a>

      <p className="text-[10px] text-text-muted text-center mt-2">
        Voce sera redirecionado para {sourceName}. Preco sujeito a alteracao.
      </p>
    </div>
  );
}
