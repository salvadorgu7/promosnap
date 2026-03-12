import Link from "next/link";
import { TrendingUp } from "lucide-react";

interface Props {
  keywords: { keyword: string; url?: string }[];
}

export default function TrendingTags({ keywords }: Props) {
  if (!keywords || keywords.length === 0) return null;

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-accent-orange" />
          <h2 className="font-display font-semibold text-sm text-text-primary">
            Em alta agora
          </h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {keywords.map((kw) => (
            <Link
              key={kw.keyword}
              href={`/busca?q=${encodeURIComponent(kw.keyword)}`}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-surface-100 border border-surface-200 text-xs text-text-secondary font-medium hover:text-accent-blue hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-all"
            >
              🔥 {kw.keyword}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
