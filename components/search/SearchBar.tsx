"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const SUGGESTIONS = ["iPhone 15", "Air Fryer", "Cadeira Gamer", "Fone Bluetooth", "Notebook", "Smart TV", "PlayStation 5", "Tênis Nike"];

export default function SearchBar({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
  }, [query, router]);

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
          focused
            ? "border-accent-blue shadow-glow bg-white"
            : "border-surface-300 bg-surface-50 hover:border-surface-400"
        } ${large ? "h-14" : "h-11"}`}>
          <Search className={`ml-4 flex-shrink-0 ${focused ? "text-accent-blue" : "text-surface-400"} ${large ? "w-5 h-5" : "w-4 h-4"}`} />
          <input
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Buscar produtos, marcas, ofertas..."
            className={`flex-1 bg-transparent outline-none px-3 text-surface-800 placeholder:text-surface-400 ${large ? "text-base" : "text-sm"}`}
          />
          <button type="submit" className={`flex-shrink-0 mr-1.5 px-4 rounded-lg bg-gradient-to-r from-accent-blue to-brand-500 text-white font-semibold hover:shadow-glow transition-all ${large ? "h-10 text-sm" : "h-8 text-xs"}`}>
            Buscar
          </button>
        </div>
      </form>

      {focused && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 rounded-xl bg-white border border-surface-200 shadow-lg z-50 animate-fade-in">
          <p className="text-xs text-text-muted mb-2 px-1">Buscas populares</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button"
                onMouseDown={() => { setQuery(s); router.push(`/busca?q=${encodeURIComponent(s)}`); }}
                className="px-3 py-1.5 rounded-lg bg-surface-100 text-sm text-surface-600 hover:text-accent-blue hover:bg-surface-50 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
