"use client";

import { useState } from "react";
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

type TimeRange = "30d" | "60d" | "90d";

function filterByRange(data: PriceHistoryPoint[], range: TimeRange): PriceHistoryPoint[] {
  if (range === "90d") return data;
  const count = range === "30d" ? 30 : 60;
  return data.slice(-count);
}

export default function PriceChart({ data, stats, height = 220 }: PriceChartProps) {
  const [range, setRange] = useState<TimeRange>("30d");

  if (data.length === 0) {
    return (
      <div className="card flex items-center justify-center text-surface-500 text-sm" style={{ height }}>
        Histórico de preço indisponível
      </div>
    );
  }

  const filtered = filterByRange(data, range);
  const mobileHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 180 : height;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-surface-600">
            <span className="w-2 h-2 rounded-full bg-accent-blue" />
            Atual: {formatPrice(stats.current)}
          </span>
          <span className="flex items-center gap-1.5 text-surface-600">
            <span className="w-2 h-2 rounded-full bg-accent-green" />
            Mín 90d: {formatPrice(stats.min90d)}
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-surface-600">
            <span className="w-2 h-2 rounded-full bg-surface-400" />
            Média 30d: {formatPrice(stats.avg30d)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["30d", "60d", "90d"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                range === r ? "bg-accent-blue/10 text-accent-blue" : "text-surface-500 hover:bg-surface-100"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={mobileHeight}>
        <AreaChart data={filtered} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2962ff" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2962ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#9ca3b8", fontSize: 11 }} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3b8", fontSize: 11 }} tickFormatter={(v) => `R$${v}`} width={60} />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e4e8f0",
              borderRadius: "8px",
              color: "#1f2937",
              fontSize: "12px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
            formatter={(value: number) => {
              const diff = stats.avg30d > 0 ? ((value - stats.avg30d) / stats.avg30d * 100).toFixed(1) : "0";
              const sign = Number(diff) > 0 ? "+" : "";
              return [`${formatPrice(value)} (${sign}${diff}% vs média)`, "Preço"];
            }}
          />
          <ReferenceLine y={stats.avg30d} stroke="#9ca3b8" strokeDasharray="4 4" strokeWidth={1} label={{ value: "Média", position: "right", fill: "#9ca3b8", fontSize: 10 }} />
          <ReferenceLine y={stats.min90d} stroke="#00c853" strokeDasharray="4 4" strokeWidth={1} />
          <Area type="monotone" dataKey="price" stroke="#2962ff" strokeWidth={2} fill="url(#priceGrad)" dot={false}
            activeDot={{ r: 5, fill: "#2962ff", stroke: "#fff", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
