import Link from "next/link";
import { Search, Home, ArrowLeft, TrendingUp } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";

const TRENDING = [
  "iPhone 15", "Galaxy S24", "Air Fryer", "PS5",
  "Notebook Gamer", "Fone Bluetooth", "Smart TV 55", "Aspirador Robo",
];

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg space-y-6">
        <div className="text-8xl font-bold font-display text-surface-200">
          404
        </div>

        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
            Pagina nao encontrada
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            A pagina que voce procura nao existe ou foi movida. Use a busca para encontrar o que precisa.
          </p>
        </div>

        {/* Search bar */}
        <div className="max-w-md mx-auto">
          <SearchBar large />
        </div>

        {/* Trending searches */}
        <div>
          <p className="text-xs text-text-muted flex items-center justify-center gap-1 mb-2">
            <TrendingUp className="w-3 h-3" /> Buscas populares
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TRENDING.map(tag => (
              <Link
                key={tag}
                href={`/busca?q=${encodeURIComponent(tag)}`}
                className="px-3 py-1.5 rounded-full bg-surface-50 border border-surface-200 text-xs text-text-secondary hover:text-brand-600 hover:border-brand-500/30 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/" className="btn-primary flex items-center gap-2 text-sm">
            <Home className="h-4 w-4" /> Inicio
          </Link>
          <Link href="/ofertas" className="btn-secondary flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" /> Ver Ofertas
          </Link>
          <Link href="/categorias" className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Categorias
          </Link>
        </div>
      </div>
    </div>
  );
}
