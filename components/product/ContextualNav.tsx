"use client";

import Link from "next/link";
import {
  ChartLine,
  Scale,
  Tag,
  Bookmark,
  Bell,
  Radio,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface ContextualNavProps {
  slug: string;
  categoryName?: string;
  categorySlug?: string;
  brandName?: string;
  brandSlug?: string;
  hasPriceAlert?: boolean;
}

interface NavLink {
  icon: typeof ChartLine;
  label: string;
  href?: string;
  scrollTo?: string;
  external?: boolean;
}

export default function ContextualNav({
  slug,
  categoryName,
  categorySlug,
  brandName,
  brandSlug,
  hasPriceAlert,
}: ContextualNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const links: NavLink[] = [
    {
      icon: ChartLine,
      label: "Ver historico de preco",
      href: `/preco/${slug}`,
    },
    {
      icon: Scale,
      label: "Comparar similares",
      scrollTo: "similar-products",
    },
    ...(categoryName && categorySlug
      ? [
          {
            icon: Tag,
            label: categoryName,
            href: `/categoria/${categorySlug}`,
          },
        ]
      : []),
    ...(brandName && brandSlug
      ? [
          {
            icon: Bookmark,
            label: brandName,
            href: `/marca/${brandSlug}`,
          },
        ]
      : []),
    ...(hasPriceAlert
      ? [
          {
            icon: Bell,
            label: "Acompanhar preco",
            scrollTo: "price-alert",
          },
        ]
      : []),
    ...(categorySlug
      ? [
          {
            icon: Radio,
            label: "Canal relacionado",
            href: `/canais/${categorySlug}`,
          },
        ]
      : []),
  ];

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Desktop: inline card */}
      <div className="hidden lg:block card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2 px-1">
          Navegacao rapida
        </p>
        <div className="space-y-0.5">
          {links.map((link) => {
            const Icon = link.icon;
            if (link.scrollTo) {
              return (
                <button
                  key={link.label}
                  onClick={() => handleScrollTo(link.scrollTo!)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-text-secondary hover:text-accent-blue hover:bg-accent-blue/5 transition-colors text-left"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                  <span className="truncate">{link.label}</span>
                </button>
              );
            }
            return (
              <Link
                key={link.label}
                href={link.href!}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs text-text-secondary hover:text-accent-blue hover:bg-accent-blue/5 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile: collapsible bar */}
      <div className="lg:hidden card overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-text-secondary"
        >
          <span>Navegacao rapida</span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        {isOpen && (
          <div className="px-3 pb-3 grid grid-cols-2 gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              if (link.scrollTo) {
                return (
                  <button
                    key={link.label}
                    onClick={() => {
                      handleScrollTo(link.scrollTo!);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-accent-blue hover:bg-accent-blue/5 transition-colors text-left"
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                    <span className="truncate">{link.label}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={link.label}
                  href={link.href!}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-text-secondary hover:text-accent-blue hover:bg-accent-blue/5 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
