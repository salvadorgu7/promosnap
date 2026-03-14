"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Flame, TrendingDown, Trophy, Tag, Menu, X, Zap, Heart,
} from "lucide-react";
import SearchBar from "@/components/search/SearchBar";
import NotificationBell from "@/components/engagement/NotificationBell";

const NAV_ITEMS = [
  { href: "/ofertas", label: "Ofertas", icon: Flame, color: "text-accent-red" },
  { href: "/menor-preco", label: "Menor Preço", icon: TrendingDown, color: "text-accent-blue" },
  { href: "/mais-vendidos", label: "Top Vendidos", icon: Trophy, color: "text-accent-orange" },
  { href: "/categoria/eletronicos", label: "Eletrônicos", icon: Zap, color: "text-brand-500" },
  { href: "/categoria/casa", label: "Casa", icon: Tag, color: "text-accent-purple" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-surface-200 shadow-sm">
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-accent-blue via-brand-500 to-accent-purple" />

      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-accent-blue to-brand-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-extrabold text-lg md:text-xl tracking-tight text-surface-900 truncate">
              Promo<span className="text-gradient">Snap</span>
            </span>
          </Link>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchBar />
          </div>

          {/* Desktop hot link + favorites + notifications */}
          <div className="hidden md:flex items-center gap-2">
            <NotificationBell />
            <Link
              href="/favoritos"
              className="p-2 rounded-lg text-surface-500 hover:text-accent-red hover:bg-surface-100 transition-colors"
              title="Meus Favoritos"
            >
              <Heart className="w-5 h-5" />
            </Link>
            <Link
              href="/ofertas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-red/10 text-accent-red text-sm font-semibold hover:bg-accent-red/15 transition-colors"
            >
              <Flame className="w-4 h-4" /> Quentes
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-lg hover:bg-surface-100">
              <Search className="w-5 h-5 text-surface-600" />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-surface-100">
              {mobileOpen ? <X className="w-5 h-5 text-surface-600" /> : <Menu className="w-5 h-5 text-surface-600" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden pb-3 animate-slide-up"><SearchBar /></div>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 pb-2 -mx-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 transition-all">
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-200 bg-white animate-slide-up">
          <nav className="px-4 py-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-surface-700 hover:bg-surface-100 transition-colors">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
            <div className="h-px bg-surface-200 my-1" />
            <Link href="/favoritos" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-surface-700 hover:bg-surface-100 transition-colors">
              <Heart className="w-4 h-4 text-accent-red" />
              <span className="text-sm font-medium">Meus Favoritos</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
