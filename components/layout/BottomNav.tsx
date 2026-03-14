"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Flame, Heart, Menu, X } from "lucide-react";
import { useState } from "react";

const tabs = [
  { href: "/", label: "Início", icon: Home },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/ofertas", label: "Ofertas", icon: Flame },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
] as const;

const menuLinks = [
  { href: "/categorias", label: "Categorias" },
  { href: "/cupons", label: "Cupons" },
  { href: "/mais-vendidos", label: "Mais Vendidos" },
  { href: "/menor-preco", label: "Menor Preço" },
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
      {/* Menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-16 left-4 right-4 bg-white rounded-xl shadow-xl border border-surface-200 p-4 animate-in slide-in-from-bottom-4">
            <nav className="flex flex-col gap-1">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href)
                      ? "bg-accent-blue/10 text-brand-500"
                      : "text-surface-700 hover:bg-surface-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
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
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* Menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              menuOpen
                ? "text-brand-500"
                : "text-surface-400 hover:text-surface-600"
            }`}
          >
            {menuOpen ? (
              <X className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
