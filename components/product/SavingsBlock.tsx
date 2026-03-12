import { TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SavingsBlockProps {
  currentPrice: number;
  originalPrice?: number;
  highestPrice?: number; // from other sources
  avgHistorical?: number; // average over time
}

export default function SavingsBlock({ currentPrice, originalPrice, highestPrice, avgHistorical }: SavingsBlockProps) {
  const savingsVsOriginal = originalPrice && originalPrice > currentPrice ? originalPrice - currentPrice : 0;
  const savingsVsHighest = highestPrice && highestPrice > currentPrice ? highestPrice - currentPrice : 0;
  const savingsVsAvg = avgHistorical && avgHistorical > currentPrice ? avgHistorical - currentPrice : 0;

  if (!savingsVsOriginal && !savingsVsHighest && !savingsVsAvg) return null;

  const items = [
    savingsVsOriginal > 0 && {
      icon: TrendingDown,
      label: "vs preço original",
      savings: savingsVsOriginal,
      color: "text-accent-green",
      bg: "bg-green-50",
    },
    savingsVsHighest > 0 && {
      icon: Wallet,
      label: "vs fonte mais cara",
      savings: savingsVsHighest,
      color: "text-accent-blue",
      bg: "bg-blue-50",
    },
    savingsVsAvg > 0 && {
      icon: BarChart3,
      label: "vs média histórica",
      savings: savingsVsAvg,
      color: "text-accent-purple",
      bg: "bg-purple-50",
    },
  ].filter(Boolean) as { icon: any; label: string; savings: number; color: string; bg: string }[];

  if (items.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-accent-green" /> Quanto você economiza
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={`${item.bg} rounded-lg p-3 text-center`}>
              <Icon className={`h-5 w-5 ${item.color} mx-auto mb-1`} />
              <p className={`text-lg font-bold font-display ${item.color}`}>
                {formatPrice(item.savings)}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
