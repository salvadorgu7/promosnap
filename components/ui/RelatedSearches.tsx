import Link from "next/link";

interface RelatedSearch {
  label: string;
  href: string;
}

interface RelatedSearchesProps {
  searches: RelatedSearch[];
  title?: string;
}

export default function RelatedSearches({
  searches,
  title = "Buscas relacionadas",
}: RelatedSearchesProps) {
  if (searches.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-text-secondary mb-3">
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">
        {searches.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="px-3 py-1.5 rounded-full bg-surface-100 text-xs text-text-secondary hover:bg-brand-50 hover:text-brand-600 hover:border-brand-500/30 border border-surface-200 transition-all"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
