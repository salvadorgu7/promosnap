"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { logger } from "@/lib/logger"
import {
  Heart,
  Search,
  Mail,
  Gift,
  X,
} from "lucide-react";

interface BannerConfig {
  id: string;
  icon: typeof Heart;
  iconColor: string;
  bgGradient: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  check: () => boolean;
}

const BANNERS: BannerConfig[] = [
  {
    id: "favorites",
    icon: Heart,
    iconColor: "text-accent-red",
    bgGradient: "from-accent-red/5 to-accent-orange/5",
    title: "Salve seus favoritos!",
    description: "Acompanhe precos e receba alertas quando baixarem.",
    cta: "Ver como funciona",
    href: "/favoritos",
    check: () => {
      try {
        const favs = localStorage.getItem("ps_favorites");
        return !favs || JSON.parse(favs).length === 0;
      } catch {
        return true;
      }
    },
  },
  {
    id: "search",
    icon: Search,
    iconColor: "text-accent-blue",
    bgGradient: "from-accent-blue/5 to-brand-500/5",
    title: "Busque e compare precos",
    description: "Encontre o melhor preco entre dezenas de lojas.",
    cta: "Buscar agora",
    href: "/busca",
    check: () => {
      try {
        const searches = localStorage.getItem("ps_recent_searches");
        return !searches || JSON.parse(searches).length === 0;
      } catch {
        return true;
      }
    },
  },
  {
    id: "newsletter",
    icon: Mail,
    iconColor: "text-accent-purple",
    bgGradient: "from-accent-purple/5 to-brand-500/5",
    title: "Receba ofertas por email",
    description: "Alertas diarios com as melhores ofertas do dia.",
    cta: "Inscrever-se",
    href: "#newsletter",
    check: () => {
      try {
        return !localStorage.getItem("ps_subscribed");
      } catch {
        return true;
      }
    },
  },
  {
    id: "referral",
    icon: Gift,
    iconColor: "text-accent-orange",
    bgGradient: "from-accent-orange/5 to-accent-red/5",
    title: "Indique e economize",
    description: "Compartilhe o PromoSnap com amigos e acompanhe o impacto.",
    cta: "Indicar agora",
    href: "/indicar",
    check: () => {
      try {
        return !localStorage.getItem("ps_referral_shared");
      } catch {
        return true;
      }
    },
  },
];

export default function GrowthBanner() {
  const [activeBanner, setActiveBanner] = useState<BannerConfig | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissedIds: string[] = JSON.parse(
        localStorage.getItem("ps_dismissed_banners") || "[]"
      );
      const available = BANNERS.filter(
        (b) => !dismissedIds.includes(b.id) && b.check()
      );
      if (available.length > 0) {
        // Cycle through banners based on time
        const index = Math.floor(Date.now() / 86400000) % available.length;
        setActiveBanner(available[index]);
      }
    } catch (err) { logger.debug("growth-banner.failed", { error: err }) }
  }, []);

  function dismiss() {
    if (!activeBanner) return;
    setDismissed(true);
    try {
      const dismissedIds: string[] = JSON.parse(
        localStorage.getItem("ps_dismissed_banners") || "[]"
      );
      dismissedIds.push(activeBanner.id);
      localStorage.setItem(
        "ps_dismissed_banners",
        JSON.stringify(dismissedIds)
      );
    } catch (err) { logger.debug("growth-banner.failed", { error: err }) }
  }

  if (!activeBanner || dismissed) return null;

  const Icon = activeBanner.icon;

  return (
    <div
      className={`relative rounded-xl bg-gradient-to-r ${activeBanner.bgGradient} border border-surface-200/60 p-4 animate-fade-in`}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-200/50 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
          <Icon className={`h-5 w-5 ${activeBanner.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-text-primary">
            {activeBanner.title}
          </p>
          <p className="text-xs text-text-muted mt-0.5 mb-2">
            {activeBanner.description}
          </p>
          <Link
            href={activeBanner.href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-blue hover:text-brand-500 transition-colors"
          >
            {activeBanner.cta} &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
