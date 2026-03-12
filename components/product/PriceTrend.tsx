import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface PriceTrendProps {
  trend: "up" | "down" | "stable";
  currentPrice: number;
  avgPrice: number;
}

export default function PriceTrend({ trend, currentPrice, avgPrice }: PriceTrendProps) {
  const diff = Math.abs(currentPrice - avgPrice);
  const pct = avgPrice > 0 ? Math.round((diff / avgPrice) * 100) : 0;

  if (trend === "stable" || pct < 3) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-100 text-text-muted text-xs font-medium">
        <Minus className="h-3.5 w-3.5" />
        Preço estável
      </div>
    );
  }

  if (trend === "down") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-accent-green text-xs font-semibold">
        <TrendingDown className="h-3.5 w-3.5" />
        Caiu {pct}% — bom momento para comprar
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-500 text-xs font-medium">
      <TrendingUp className="h-3.5 w-3.5" />
      Subiu {pct}% recentemente
    </div>
  );
}
