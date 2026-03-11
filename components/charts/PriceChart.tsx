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
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            Atual: {formatPrice(stats.current)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            Mín 90d: {formatPrice(stats.min90d)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-surface-400" />
            Média 30d: {formatPrice(stats.avg30d)}
          </span>
        </div>
        <span className={`text-xs font-semibold ${
          stats.trend === "down" ? "text-accent-green" : stats.trend === "up" ? "text-accent-red" : "text-text-muted"
        }`}>
          {stats.trend === "down" ? "📉 Em queda" : stats.trend === "up" ? "📈 Subindo" : "➡️ Estável"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2962ff" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#2962ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#9ca3b8", fontSize: 11 }} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3b8", fontSize: 11 }} tickFormatter={(v) => `R$${v}`} width={60} />
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
  );
}
