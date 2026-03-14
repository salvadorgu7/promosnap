"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Clock, Tag, Package } from "lucide-react";
import VoiceSearch from "./VoiceSearch";

interface Suggestion {
  text: string;
  type: "product" | "trending" | "popular" | "brand" | "recent";
}

const SUGGESTION_ICON: Record<Suggestion["type"], typeof Search> = {
  product: Package,
  trending: TrendingUp,
  popular: Search,
  brand: Tag,
  recent: Clock,
};

const SUGGESTION_COLOR: Record<Suggestion["type"], string> = {
  product: "text-surface-400",
  trending: "text-orange-400",
  popular: "text-blue-400",
  brand: "text-purple-400",
  recent: "text-blue-400",
};

const POPULAR_SEARCHES = [
  "iPhone 15",
  "Air Fryer",
  "Cadeira Gamer",
  "Fone Bluetooth",
  "Notebook",
  "Smart TV",
  "PlayStation 5",
  "Tenis Nike",
];

export default function SearchBar({ large = false }: { large?: boolean }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(query.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          // Support both old (string[]) and new (Suggestion[]) formats
          const mapped: Suggestion[] = Array.isArray(data)
            ? data.map((item: string | Suggestion) =>
                typeof item === "string"
                  ? { text: item, type: "product" as const }
                  : item
              )
            : [];
          setSuggestions(mapped);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const navigate = useCallback(
    (term: string) => {
      if (term.trim()) {
        setQuery(term);
        setFocused(false);
        setSuggestions([]);
        setHighlightIndex(-1);
        router.push(`/busca?q=${encodeURIComponent(term.trim())}`);
      }
    },
    [router]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        navigate(suggestions[highlightIndex].text);
      } else {
        navigate(query);
      }
    },
    [query, navigate, highlightIndex, suggestions]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!focused) return;

      const items = suggestions.length > 0 ? suggestions : [];
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : items.length - 1
        );
      } else if (e.key === "Escape") {
        setFocused(false);
        setHighlightIndex(-1);
      }
    },
    [focused, suggestions]
  );

  const showDropdown = focused;
  const hasSuggestions = suggestions.length > 0 && query.trim().length >= 2;

  return (
    <div className="relative w-full" ref={containerRef}>
      <form onSubmit={handleSubmit}>
        <div
          className={`relative flex items-center rounded-xl border transition-all duration-200 ${
            focused
              ? "border-brand-500/50 shadow-glow bg-white"
              : "border-surface-200 bg-white hover:border-surface-300"
          } ${large ? "h-14" : "h-11"}`}
        >
          <Search
            className={`ml-4 flex-shrink-0 ${
              focused ? "text-brand-500" : "text-surface-400"
            } ${large ? "w-5 h-5" : "w-4 h-4"}`}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIndex(-1);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar produtos, marcas, ofertas..."
            className={`flex-1 bg-transparent outline-none px-3 text-surface-800 placeholder:text-surface-400 ${
              large ? "text-base" : "text-sm"
            }`}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
          <VoiceSearch onResult={(text) => navigate(text)} />
          <button
            type="submit"
            className={`flex-shrink-0 mr-1.5 px-4 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold hover:shadow-glow transition-all ${
              large ? "h-10 text-sm" : "h-8 text-xs"
            }`}
          >
            Buscar
          </button>
        </div>
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-white border border-surface-200 shadow-lg z-50 animate-fade-in overflow-hidden">
          {hasSuggestions ? (
            <ul role="listbox" className="py-1">
              {suggestions.map((s, i) => {
                const Icon = SUGGESTION_ICON[s.type] || Search;
                const iconColor = SUGGESTION_COLOR[s.type] || "text-surface-400";
                return (
                  <li
                    key={`${s.type}-${s.text}`}
                    role="option"
                    aria-selected={i === highlightIndex}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      i === highlightIndex
                        ? "bg-brand-50 text-brand-600"
                        : "text-text-primary hover:bg-surface-50"
                    }`}
                    onMouseDown={() => navigate(s.text)}
                    onMouseEnter={() => setHighlightIndex(i)}
                  >
                    <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${iconColor}`} />
                    <span className="text-sm truncate">{s.text}</span>
                    {s.type === "trending" && (
                      <span className="ml-auto text-[10px] font-medium text-orange-400 bg-orange-50 px-1.5 py-0.5 rounded">
                        trending
                      </span>
                    )}
                    {s.type === "popular" && (
                      <span className="ml-auto text-[10px] font-medium text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">
                        popular
                      </span>
                    )}
                    {s.type === "brand" && (
                      <span className="ml-auto text-[10px] font-medium text-purple-400 bg-purple-50 px-1.5 py-0.5 rounded">
                        marca
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : query.trim().length >= 2 && loading ? (
            <div className="px-4 py-4 text-center">
              <div className="inline-block w-4 h-4 border-2 border-surface-300 border-t-accent-blue rounded-full animate-spin" />
            </div>
          ) : query.trim().length < 2 ? (
            <div className="p-3">
              <p className="text-xs text-text-muted mb-2 px-1 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> Buscas populares
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => navigate(s)}
                    className="px-3 py-1.5 rounded-lg bg-surface-100 text-sm text-surface-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : !loading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-center text-sm text-text-muted">
              Nenhuma sugestao encontrada
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
