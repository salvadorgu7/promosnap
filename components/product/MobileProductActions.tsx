"use client";

import { ExternalLink, Heart, Share2, ShieldCheck, Zap, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/utils";
import { analytics } from "@/lib/analytics/events";
import { logger } from "@/lib/logger"

interface MobileProductActionsProps {
  offerId: string;
  price: number;
  sourceName: string;
  productSlug: string;
  productName: string;
  discount?: number;
  offerScore?: number;
  originalPrice?: number;
}

export default function MobileProductActions({
  offerId,
  price,
  sourceName,
  productSlug,
  productName,
  discount,
  offerScore = 0,
  originalPrice,
}: MobileProductActionsProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    try {
      const favorites = JSON.parse(localStorage.getItem("ps_favorites") || "[]");
      setIsFavorited(favorites.some((f: any) => (f.slug || f) === productSlug));
    } catch (err) { logger.debug("mobile-actions.failed", { error: err }) }
  }, [productSlug]);

  const toggleFavorite = () => {
    try {
      const favorites = JSON.parse(localStorage.getItem("ps_favorites") || "[]");
      if (isFavorited) {
        const updated = favorites.filter((f: any) => (f.slug || f) !== productSlug);
        localStorage.setItem("ps_favorites", JSON.stringify(updated));
        setIsFavorited(false);
      } else {
        favorites.push({ slug: productSlug, name: productName, price, addedAt: new Date().toISOString() });
        localStorage.setItem("ps_favorites", JSON.stringify(favorites));
        setIsFavorited(true);
      }
    } catch (err) { logger.debug("mobile-actions.failed", { error: err }) }
  };

  const handleShare = async () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";
    const productUrl = `${appUrl}/produto/${productSlug}?utm_source=share&utm_medium=whatsapp`;

    const shareText = [
      `🔥 ${productName}`,
      `💰 ${formatPrice(price)}${discount && discount > 0 ? ` (-${discount}%)` : ""}`,
      originalPrice && originalPrice > price ? `De: ${formatPrice(originalPrice)}` : null,
      `📦 ${sourceName}`,
      ``,
      `👉 ${productUrl}`,
    ].filter(Boolean).join("\n");

    analytics.shareClick({
      contentType: "product",
      contentId: productSlug,
      method: "whatsapp_mobile",
    });

    // Em mobile, tentar Web Share API primeiro (abre sheet nativo do sistema)
    try {
      if (navigator.share) {
        await navigator.share({
          title: productName,
          text: `${productName} por ${formatPrice(price)}${discount ? ` (-${discount}%)` : ""} no ${sourceName}`,
          url: productUrl,
        });
        return;
      }
    } catch {
      // Cancelado — fallback para WhatsApp direto
    }

    // Fallback: abrir WhatsApp diretamente
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const clickoutUrl = `/api/clickout/${offerId}?page=product&product=${productSlug}&origin=mobile_bar`;

  const isGreatDeal = offerScore >= 80 || (discount && discount >= 30);
  const ctaLabel = offerScore >= 80 ? "Aproveitar Agora" : discount && discount >= 30 ? "Garantir Oferta" : "Comprar";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-surface-200 safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      {/* Urgency strip for great deals */}
      {isGreatDeal && (
        <div className="bg-gradient-to-r from-accent-green/10 to-green-50 px-4 py-1 flex items-center justify-center gap-1.5">
          <Zap className="w-3 h-3 text-accent-green" />
          <span className="text-[10px] font-semibold text-accent-green">
            {discount && discount >= 30 ? `${discount}% OFF — preço pode mudar a qualquer momento` : "Oportunidade verificada"}
          </span>
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold font-display text-text-primary">
              R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
            {discount && discount > 0 && (
              <span className="text-xs font-bold text-white bg-accent-red px-1.5 py-0.5 rounded">
                -{discount}%
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-muted truncate flex items-center gap-1">
            <ShieldCheck className="w-2.5 h-2.5 text-accent-green" />
            Compra segura via {sourceName}
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={toggleFavorite}
          className={`p-2 rounded-lg border transition-colors ${
            isFavorited
              ? "bg-red-50 border-red-200 text-accent-red"
              : "bg-surface-50 border-surface-200 text-text-muted"
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
        </button>

        {/* Share — WhatsApp branding para dar relevancia */}
        <button
          onClick={handleShare}
          className="p-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
          aria-label="Compartilhar no WhatsApp"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            const el = document.getElementById("price-alert");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              window.dispatchEvent(new CustomEvent("ps:open-alert"));
            }
          }}
          className="p-2 rounded-lg border border-accent-orange/30 bg-accent-orange/10 text-accent-orange"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Buy CTA — larger and more prominent */}
        <a
          href={clickoutUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className={`flex items-center gap-1.5 px-5 py-3 rounded-xl text-white text-sm font-bold transition-all shadow-lg ${
            isGreatDeal
              ? "bg-gradient-to-r from-accent-green to-green-600 shadow-green-200"
              : "bg-accent-green hover:bg-green-600"
          }`}
        >
          {isGreatDeal && <Zap className="w-4 h-4" />}
          {ctaLabel}
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
