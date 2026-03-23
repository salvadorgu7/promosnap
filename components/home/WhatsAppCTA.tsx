"use client";

import { MessageCircle, Users, Zap, ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics/events";
import Link from "next/link";

/**
 * WhatsApp Community CTA — aparece na homepage e outras paginas.
 * Convite para entrar no grupo de ofertas do WhatsApp.
 * Renderiza apenas se NEXT_PUBLIC_WHATSAPP_GROUP_LINK estiver definido.
 */

const WHATSAPP_LINK = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_LINK;

interface WhatsAppCTAProps {
  variant?: "banner" | "compact" | "inline";
}

export default function WhatsAppCTA({ variant = "banner" }: WhatsAppCTAProps) {
  if (!WHATSAPP_LINK) return null;

  const trackClick = () => {
    analytics.shareClick({ contentType: "article", contentId: "whatsapp-group", method: `whatsapp_group_${variant}` });
  };

  // ── Compact: small card for sidebar or footer ──
  if (variant === "compact") {
    return (
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
        className="flex items-center gap-3 p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/15 hover:border-[#25D366]/30 transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0 shadow-sm">
          <MessageCircle className="w-4.5 h-4.5 text-white" fill="white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Grupo WhatsApp</p>
          <p className="text-[11px] text-text-muted truncate">Ofertas diarias direto no Zap</p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#25D366] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
      </a>
    );
  }

  // ── Inline: single-line for product pages ──
  if (variant === "inline") {
    return (
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#25D366]/8 border border-[#25D366]/15 hover:bg-[#25D366]/12 transition-all text-sm"
      >
        <MessageCircle className="w-4 h-4 text-[#25D366] flex-shrink-0" fill="#25D366" />
        <span className="text-text-secondary">Receba ofertas como essa no</span>
        <span className="font-semibold text-[#25D366]">WhatsApp</span>
        <ArrowRight className="w-3.5 h-3.5 text-[#25D366] ml-auto" />
      </a>
    );
  }

  // ── Banner: full-width for homepage (default) ──
  return (
    <section className="py-5 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] p-5 md:p-8">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/8 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="relative flex flex-col md:flex-row items-center gap-5 md:gap-8">
            {/* Icon + text */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium mb-3">
                <Zap className="w-3.5 h-3.5" />
                Ofertas em tempo real
              </div>
              <h2 className="font-display font-bold text-xl md:text-2xl text-white mb-1.5">
                Entre no grupo de ofertas do WhatsApp
              </h2>
              <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed">
                Receba as melhores ofertas verificadas pelo PromoSnap direto no seu WhatsApp. Sem spam — apenas o que vale a pena.
              </p>

              {/* Social proof */}
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-white/70 text-xs">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Comunidade ativa
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  Ofertas score 80+
                </span>
              </div>
            </div>

            {/* CTA button */}
            <div className="flex-shrink-0">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackClick}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white text-[#25D366] rounded-xl font-bold text-sm md:text-base hover:bg-white/95 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] touch-target"
              >
                <MessageCircle className="w-5 h-5" fill="#25D366" />
                Entrar no Grupo
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
