import { Star, Info } from "lucide-react";
import type { ConsolidatedRating as ConsolidatedRatingType } from "@/lib/reviews/types";

interface Props {
  rating: ConsolidatedRatingType;
}

function StarRating({ value }: { value: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = value >= i ? "fill-current" : value >= i - 0.5 ? "fill-current opacity-50" : "";
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${fill ? `text-accent-orange ${fill}` : "text-surface-300"}`}
      />,
    );
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
}

const CONFIDENCE_CONFIG = {
  low: { label: "Poucos dados", color: "text-amber-600 bg-amber-50" },
  medium: { label: "Confiavel", color: "text-blue-600 bg-blue-50" },
  high: { label: "Alta confianca", color: "text-green-600 bg-green-50" },
};

export default function ConsolidatedRating({ rating }: Props) {
  const confConfig = CONFIDENCE_CONFIG[rating.confidence];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Star className="h-4 w-4 text-accent-orange fill-current" />
          Avaliacao Consolidada
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${confConfig.color}`}
        >
          {confConfig.label}
        </span>
      </div>

      {/* Main rating */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl font-bold font-display text-text-primary">
          {rating.consolidatedRating.toFixed(1)}
        </span>
        <div>
          <StarRating value={rating.consolidatedRating} />
          <p className="text-xs text-text-muted mt-0.5">
            {rating.totalReviews.toLocaleString("pt-BR")} avaliacoes
            {rating.sourcesCount > 1 && ` em ${rating.sourcesCount} lojas`}
          </p>
        </div>
      </div>

      {/* Source breakdown (when multiple sources) */}
      {rating.sourceBreakdown.length > 1 && (
        <div className="space-y-1.5 pt-3 border-t border-surface-100">
          {rating.sourceBreakdown.map((source) => (
            <div key={source.sourceSlug} className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{source.sourceName}</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5 text-accent-orange">
                  <Star className="h-3 w-3 fill-current" />
                  {source.rating.toFixed(1)}
                </span>
                <span className="text-text-muted">
                  ({source.reviewsCount.toLocaleString("pt-BR")})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-surface-100">
        <Info className="h-3 w-3 text-text-muted flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-text-muted leading-relaxed">
          Avaliacao consolidada com base nas lojas monitoradas. As notas sao ponderadas pela
          quantidade de avaliacoes e confiabilidade de cada fonte.
        </p>
      </div>
    </div>
  );
}
