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
      <div className="card flex items-center justify-center text-surface-500 text-sm" style={{ height }}>
        Histórico de preço indisponível
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-surface-300">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            Atual: {formatPrice(stats.current)}
          </span>
          <span className="flex items-center gap-1.5 text-surface-300">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            Mín 90d: {formatPrice(stats.min90d)}
          </span>
          <span className="flex items-center gap-1.5 text-surface-300">
            <span className="w-2 h-2 rounded-full bg-surface-500" />
            Média 30d: {formatPrice(stats.avg30d)}
          </span>
        </div>
        <span className={`text-xs font-semibold ${
          stats.trend === "down" ? "text-accent-green" : stats.trend === "up" ? "text-accent-red" : "text-surface-500"
        }`}>
          {stats.trend === "down" ? "📉 Em queda" : stats.trend === "up" ? "📈 Subindo" : "➡️ Estável"}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2962ff" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2962ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#5e5e88", fontSize: 11 }} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#5e5e88", fontSize: 11 }} tickFormatter={(v) => `R$${v}`} width={60} />
          <Tooltip
            contentStyle={{
              background: "#12121e",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
            formatter={(value: number) => [formatPrice(value), "Preço"]}
          />
          <ReferenceLine y={stats.avg30d} stroke="#5e5e88" strokeDasharray="4 4" strokeWidth={1} />
          <ReferenceLine y={stats.min90d} stroke="#00e676" strokeDasharray="4 4" strokeWidth={1} />
          <Area type="monotone" dataKey="price" stroke="#2962ff" strokeWidth={2} fill="url(#priceGrad)" dot={false}
            activeDot={{ r: 4, fill: "#2962ff", stroke: "#0a0a14", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
