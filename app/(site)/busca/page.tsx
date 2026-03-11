import { Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata } from "@/lib/seo/metadata";
import { MOCK_HOT_OFFERS, MOCK_BEST_SELLERS } from "@/lib/mock-data";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  return buildMetadata({
    title: q ? `${q} - Busca` : "Buscar Ofertas",
    description: q ? `Compare preços de "${q}" nas melhores lojas.` : undefined,
    path: `/busca${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  });
}

export default async function BuscaPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const params = await searchParams;
  const query = params.q || "";
  const sort = params.sort || "relevance";

  const allProducts = [...MOCK_HOT_OFFERS, ...MOCK_BEST_SELLERS];
  const results = query
    ? allProducts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : allProducts;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-text-primary mb-1">
          {query ? `Resultados para "${query}"` : "Todas as ofertas"}
        </h1>
        <p className="text-sm text-text-muted">{results.length} resultados</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
            </h3>
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-text-secondary">Preço</p>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" className="input text-xs py-1.5 px-2" />
                <input type="number" placeholder="Max" className="input text-xs py-1.5 px-2" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Lojas</p>
              {["Amazon", "Mercado Livre", "Shopee", "Shein"].map((s) => (
                <label key={s} className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-text-secondary">
                  <input type="checkbox" className="rounded" /> {s}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-surface-100 border border-surface-200">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar:
            </div>
            <div className="flex gap-1">
              {[
                { value: "relevance", label: "Relevância" },
                { value: "price_asc", label: "Menor Preço" },
                { value: "score", label: "Melhor Oferta" },
              ].map((opt) => (
                <a key={opt.value} href={`/busca?q=${encodeURIComponent(query)}&sort=${opt.value}`}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sort === opt.value ? "bg-accent-blue/10 text-accent-blue" : "text-text-muted hover:bg-surface-200"
                  }`}>
                  {opt.label}
                </a>
              ))}
            </div>
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {results.map((p) => <OfferCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16 card">
              <Search className="h-12 w-12 text-surface-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                {query ? "Nenhum resultado" : "Busque um produto"}
              </h2>
              <p className="text-sm text-text-muted">
                {query ? "Tente buscar com outras palavras." : "Digite o nome do produto."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
