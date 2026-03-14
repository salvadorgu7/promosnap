"use client";

import { ExternalLink, ShoppingBag } from "lucide-react";

export default function AmazonPromo() {
  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FF9900]/10 via-[#FF9900]/5 to-amber-50 border border-[#FF9900]/20 p-4 sm:p-5">
          {/* Subtle pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF9900]/5 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
            {/* Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF9900]/15 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#FF9900]" />
              </div>
              <div className="sm:hidden">
                <h3 className="font-display font-bold text-sm text-text-primary">Compre na Amazon</h3>
                <p className="text-[11px] text-text-muted">Apoie o PromoSnap sem custo extra</p>
              </div>
            </div>

            {/* Desktop text */}
            <div className="hidden sm:block flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm text-text-primary">
                Compre na Amazon e apoie o PromoSnap
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Ao comprar por este link, uma pequena comissao vai para o PromoSnap — sem nenhum custo extra para voce
              </p>
            </div>

            {/* Mobile text */}
            <p className="sm:hidden text-xs text-text-muted">
              Ao comprar por este link, uma pequena comissao vai para o PromoSnap — sem custo extra para voce
            </p>

            {/* CTA */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href="https://www.amazon.com.br/?tag=promosnap-20"
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#FF9900] text-white text-sm font-semibold hover:bg-[#E8890A] transition-colors whitespace-nowrap flex-1 sm:flex-initial justify-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ir para Amazon</span>
                <span className="sm:hidden">Amazon</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
