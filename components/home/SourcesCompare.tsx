import { Store, ExternalLink, CheckCircle } from "lucide-react";
import Link from "next/link";

interface SourceInfo {
  name: string;
  slug: string;
  offerCount: number;
  status: string;
}

interface SourcesCompareProps {
  sources: SourceInfo[];
}

const SOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "mercadolivre": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  "amazon-br": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "shopee": { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  "shein": { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export default function SourcesCompare({ sources }: SourcesCompareProps) {
  // Only show sources that actually have offers — showing 0 looks broken
  const activeSources = sources.filter((s) => s.offerCount > 0);
  if (activeSources.length === 0) return null;

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-5">
          <Store className="w-5 h-5 text-brand-500" />
          <h2 className="font-display font-bold text-lg text-text-primary">Comparar Fontes</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activeSources.map((s) => {
            const colors = SOURCE_COLORS[s.slug] || { bg: "bg-surface-50", text: "text-text-primary", border: "border-surface-200" };
            return (
              <Link
                key={s.slug}
                href={`/busca?source=${s.slug}`}
                className={`${colors.bg} border ${colors.border} rounded-xl p-4 hover:shadow-md transition-all group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-display font-bold text-sm ${colors.text}`}>{s.name}</h3>
                  <CheckCircle className="h-4 w-4 text-accent-green" />
                </div>
                <p className="text-2xl font-bold font-display text-text-primary">{s.offerCount}</p>
                <p className="text-xs text-text-muted">ofertas ativas</p>
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-3 w-3" /> Ver ofertas
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
