"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { formatPrice } from "@/lib/utils";
import type { PriceHistoryPoint, PriceStats } from "@/types";

interface PriceChartProps {
  data: PriceHistoryPoint[];
  stats: PriceStats;
  height?: number;
}

export default function PriceChart({ data, stats, height = 220 }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center text-text-muted text-sm" style={{ height }}>
        Histórico de preço indisponível
      </div>
    );
  }

  return (
    <div className="card p-3 md:p-4 overflow-hidden">
      {/* Stats legend — stacks vertically on very small screens */}
      <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs flex-wrap">
          <span className="flex items-center gap-1 md:gap-1.5">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent-blue flex-shrink-0" />
            Atual: {formatPrice(stats.current)}
          </span>
          <span className="flex items-center gap-1 md:gap-1.5">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent-green flex-shrink-0" />
            Mín: {formatPrice(stats.min90d)}
          </span>
          <span className="flex items-center gap-1 md:gap-1.5">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-surface-400 flex-shrink-0" />
            Média: {formatPrice(stats.avg30d)}
          </span>
        </div>
        <span className={`text-[10px] md:text-xs font-semibold ${
          stats.trend === "down" ? "text-accent-green" : stats.trend === "up" ? "text-accent-red" : "text-text-muted"
        }`}>
          {stats.trend === "down" ? "📉 Em queda" : stats.trend === "up" ? "📈 Subindo" : "➡️ Estável"}
        </span>
      </div>

      {/* Chart container — overflow-hidden prevents horizontal scroll on mobile */}
      <div className="w-full overflow-hidden" style={{ maxWidth: "100%" }}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 4, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2962ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2962ff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9ca3b8", fontSize: 10 }}
              tickMargin={6}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9ca3b8", fontSize: 10 }}
              tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
              width={42}
              domain={["dataMin - 20", "dataMax + 20"]}
            />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e4e8f0", borderRadius: "8px", color: "#1f2937", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              formatter={(value: number) => [formatPrice(value), "Preço"]}
            />
            <ReferenceLine y={stats.avg30d} stroke="#9ca3b8" strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine y={stats.min90d} stroke="#00c853" strokeDasharray="4 4" strokeWidth={1} />
            <Area type="monotone" dataKey="price" stroke="#2962ff" strokeWidth={2} fill="url(#priceGrad)" dot={false}
              activeDot={{ r: 4, fill: "#2962ff", stroke: "#fff", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
