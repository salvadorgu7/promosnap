import Link from "next/link";
import { Search } from "lucide-react";

interface RelatedSearchesProps {
  searches: string[];
  title?: string;
}

export default function RelatedSearches({ searches, title = "Pesquisas relacionadas" }: RelatedSearchesProps) {
  if (!searches || searches.length === 0) return null;

  return (
    <section className="mt-8 pt-6 border-t border-surface-200">
      <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-text-muted" />
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {searches.map((term) => (
          <Link
            key={term}
            href={`/busca?q=${encodeURIComponent(term)}`}
            className="px-3 py-1.5 rounded-full bg-surface-100 text-xs text-text-secondary hover:bg-accent-blue/10 hover:text-accent-blue border border-surface-200 hover:border-accent-blue/30 transition-all"
          >
            {term}
          </Link>
        ))}
      </div>
    </section>
  );
}
