"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Flame, TrendingDown, Trophy, Tag, Menu, X, Zap, Heart,
} from "lucide-react";
import SearchBar from "@/components/search/SearchBar";

const NAV_ITEMS = [
  { href: "/ofertas", label: "Ofertas", icon: Flame, color: "text-accent-red" },
  { href: "/menor-preco", label: "Menor Preço", icon: TrendingDown, color: "text-accent-blue" },
  { href: "/mais-vendidos", label: "Top Vendidos", icon: Trophy, color: "text-accent-orange" },
  { href: "/categoria/eletronicos", label: "Eletrônicos", icon: Zap, color: "text-accent-purple" },
  { href: "/categoria/casa", label: "Casa", icon: Tag, color: "text-accent-cyan" },
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
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display font-extrabold text-xl tracking-tight text-surface-900">
              <span className="hidden sm:inline">Promo</span>
              <span className="sm:hidden">P</span>
              <span className="text-gradient"><span className="hidden sm:inline">Snap</span><span className="sm:hidden">S</span></span>
            </span>
          </Link>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <SearchBar />
          </div>

          {/* Desktop hot link + favorites */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/favoritos"
              className="p-2 rounded-lg text-surface-500 hover:text-accent-red hover:bg-surface-100 transition-colors"
              title="Meus Favoritos"
            >
              <Heart className="w-5 h-5" />
            </Link>
            <Link
              href="/ofertas"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-red/10 text-accent-red text-sm font-semibold hover:bg-accent-red/20 transition-colors"
            >
              <Flame className="w-4 h-4 animate-pulse" /> Quentes
            </Link>
          </div>

          {/* Mobile buttons */}
          <div className="flex md:hidden items-center gap-1">
            <button onClick={() => { setSearchOpen(!searchOpen); setMobileOpen(false); }} className="p-2 rounded-lg hover:bg-surface-100">
              <Search className="w-5 h-5 text-surface-600" />
            </button>
            <button onClick={() => { setMobileOpen(!mobileOpen); setSearchOpen(false); }} className="p-2 rounded-lg hover:bg-surface-100">
              {mobileOpen ? <X className="w-5 h-5 text-surface-600" /> : <Menu className="w-5 h-5 text-surface-600" />}
            </button>
          </div>
        </div>

        {/* Mobile search - full width */}
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

        {/* Mobile horizontal nav categories */}
        <div className="md:hidden overflow-x-auto pb-2 -mx-1 scrollbar-none">
          <div className="flex items-center gap-1 min-w-max px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-surface-600 hover:bg-surface-100 transition-colors whitespace-nowrap border border-surface-200">
                  <Icon className={`w-3 h-3 ${item.color}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 md:hidden shadow-xl animate-slide-right overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-surface-200">
              <span className="font-display font-bold text-surface-900">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-surface-100">
                <X className="w-5 h-5 text-surface-600" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-700 hover:bg-surface-100 transition-colors">
                    <Icon className={`w-5 h-5 ${item.color}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
