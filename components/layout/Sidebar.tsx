"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Flame,
  Tag,
  Award,
  BookOpen,
  Ticket,
  Heart,
  TrendingUp,
  GitCompareArrows,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/ofertas", label: "Ofertas", icon: Flame },
  { href: "/categorias", label: "Categorias", icon: Tag },
  { href: "/marcas", label: "Marcas", icon: Award },
  { href: "/guias", label: "Guias", icon: BookOpen },
  { href: "/cupons", label: "Cupons", icon: Ticket },
  { href: "/favoritos", label: "Favoritos", icon: Heart },
  { href: "/mais-vendidos", label: "Trending", icon: TrendingUp },
  { href: "/comparar", label: "Comparar", icon: GitCompareArrows },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`sidebar-root hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen z-40 transition-all duration-300 ease-out ${
        expanded ? "w-52" : "w-16"
      }`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Dark surface background */}
      <div className="flex flex-col h-full bg-surface-900 border-r border-surface-800">
        {/* Top spacer to align with header */}
        <div className="h-[57px] flex items-center justify-center border-b border-surface-800 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-surface-400 hover:text-white hover:bg-surface-800 transition-colors"
          >
            {expanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto sidebar-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-item group flex items-center gap-3 rounded-lg transition-all duration-200 relative ${
                  expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                } ${
                  active
                    ? "bg-accent-blue/15 text-accent-blue"
                    : "text-surface-400 hover:text-white hover:bg-surface-800"
                }`}
                title={!expanded ? item.label : undefined}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent-blue" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${
                    active ? "stroke-[2.5]" : "group-hover:scale-110"
                  } transition-transform`}
                />
                {expanded && (
                  <span className="text-sm font-medium whitespace-nowrap sidebar-label">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom branding */}
        <div className="px-2 py-3 border-t border-surface-800 flex-shrink-0">
          {expanded ? (
            <div className="px-3 py-2">
              <p className="text-[10px] text-surface-500 leading-relaxed">
                PromoSnap &copy; {new Date().getFullYear()}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-accent-blue to-brand-500 opacity-60" />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
