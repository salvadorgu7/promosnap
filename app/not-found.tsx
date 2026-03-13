import Link from "next/link";
import { Search, Home, Flame, Ticket } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";

const QUICK_LINKS = [
  { href: "/", label: "Página inicial", icon: Home },
  { href: "/ofertas", label: "Ofertas quentes", icon: Flame },
  { href: "/cupons", label: "Cupons de desconto", icon: Ticket },
  { href: "/busca", label: "Buscar produtos", icon: Search },
];

const POPULAR_CATEGORIES = [
  { href: "/categoria/celulares", label: "Celulares" },
  { href: "/categoria/notebooks", label: "Notebooks" },
  { href: "/categoria/audio", label: "Fones de ouvido" },
  { href: "/categoria/smart-tvs", label: "Smart TVs" },
  { href: "/categoria/casa", label: "Casa" },
];

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center">
        {/* Branding */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-6">
            <Search className="w-3.5 h-3.5" />
            PromoSnap
          </div>
          <h1 className="text-6xl font-extrabold font-display text-text-primary mb-3">
            404
          </h1>
          <h2 className="text-xl font-semibold text-text-secondary mb-2">
            Página não encontrada
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            A página que você está procurando não existe ou foi movida.
            Mas não se preocupe, temos muitas ofertas esperando por você!
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-lg mx-auto mb-10">
          <SearchBar large />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card p-4 flex flex-col items-center gap-2 hover:border-accent-blue/30 transition-colors group"
            >
              <link.icon className="w-5 h-5 text-surface-400 group-hover:text-accent-blue transition-colors" />
              <span className="text-xs font-medium text-text-secondary group-hover:text-accent-blue transition-colors">
                {link.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Popular categories */}
        <div>
          <p className="text-xs text-text-muted mb-3">Categorias populares</p>
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="px-3 py-1.5 rounded-full bg-surface-100 text-xs text-text-secondary hover:text-accent-blue hover:bg-surface-50 transition-colors"
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
