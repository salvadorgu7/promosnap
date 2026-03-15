"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Flame, Heart, Grid3X3, X, Smartphone, Laptop, Footprints, Tag, Trophy, TrendingDown, Bell, ChevronRight } from "lucide-react";
import { useState } from "react";

const tabs = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/ofertas", label: "Ofertas", icon: Flame },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
] as const;

const categoryLinks = [
  { href: "/categoria/celulares", label: "Celulares", icon: Smartphone, color: "text-accent-blue" },
  { href: "/categoria/notebooks", label: "Notebooks", icon: Laptop, color: "text-accent-purple" },
  { href: "/categoria/esportes", label: "Tenis & Esportes", icon: Footprints, color: "text-accent-green" },
];

const menuLinks = [
  { href: "/categorias", label: "Todas as Categorias", icon: Grid3X3, color: "text-brand-500" },
  { href: "/mais-vendidos", label: "Mais Vendidos", icon: Trophy, color: "text-accent-orange" },
  { href: "/menor-preco", label: "Menor Preco", icon: TrendingDown, color: "text-accent-blue" },
  { href: "/cupons", label: "Cupons", icon: Tag, color: "text-accent-orange" },
  { href: "/radar", label: "Meu Radar", icon: Bell, color: "text-accent-purple" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Menu overlay — categories panel */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-16 left-4 right-4 bg-white rounded-xl shadow-xl border border-surface-200 p-4 animate-in slide-in-from-bottom-4">
            {/* Priority categories */}
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Categorias em Destaque</p>
            <nav className="flex flex-col gap-0.5 mb-3">
              {categoryLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith(link.href)
                        ? "bg-accent-blue/10 text-brand-500"
                        : "text-surface-700 hover:bg-surface-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${link.color}`} />
                    {link.label}
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-surface-400" />
                  </Link>
                );
              })}
            </nav>

            <div className="h-px bg-surface-200 mb-3" />

            {/* Other links */}
            <nav className="flex flex-col gap-0.5">
              {menuLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname.startsWith(link.href)
                        ? "bg-accent-blue/10 text-brand-500"
                        : "text-surface-700 hover:bg-surface-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${link.color}`} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-surface-200/80 safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  active
                    ? "text-brand-500"
                    : "text-surface-400 hover:text-surface-600"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>{tab.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-500 rounded-b-full" />
                )}
              </Link>
            );
          })}

          {/* Categories toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              menuOpen
                ? "text-brand-500"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            {menuOpen ? (
              <X className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Grid3X3 className="w-5 h-5" />
            )}
            <span className={`text-[10px] ${menuOpen ? "font-bold" : "font-medium"}`}>Categorias</span>
          </button>
        </div>
      </nav>
    </>
  );
}
