import { Award, TrendingUp, Heart } from "lucide-react";
import type { CategoryInsight, RankingBadgeType } from "@/lib/reviews/types";

interface Props {
  insight: CategoryInsight;
}

const BADGE_CONFIG: Record<RankingBadgeType, { icon: typeof Award; color: string; bg: string }> = {
  "top-rated": {
    icon: Award,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  "best-value": {
    icon: TrendingUp,
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  "most-popular": {
    icon: Heart,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
};

export default function CategoryInsights({ insight }: Props) {
  if (insight.badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {insight.badges.map((badge) => {
        const config = BADGE_CONFIG[badge.type];
        const Icon = config.icon;

        return (
          <div
            key={badge.type}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${config.bg} ${config.color}`}
            title={badge.description}
          >
            <Icon className="h-3.5 w-3.5" />
            {badge.label}
          </div>
        );
      })}
      {insight.totalRatedInCategory > 1 && (
        <span className="inline-flex items-center text-[10px] text-text-muted px-1">
          #{insight.positionByRating} de {insight.totalRatedInCategory} em {insight.categoryName}
        </span>
      )}
    </div>
  );
}
