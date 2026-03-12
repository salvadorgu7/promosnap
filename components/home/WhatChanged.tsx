"use client";

import { useEffect, useState } from "react";
import { TrendingDown, Plus, Bell, Activity } from "lucide-react";

interface ChangeStats {
  priceDropsToday: number;
  newOffersToday: number;
  alertsTriggeredRecently: number;
}

export default function WhatChanged() {
  const [stats, setStats] = useState<ChangeStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/stats/changes")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((data: ChangeStats) => {
        if (data.priceDropsToday > 0 || data.newOffersToday > 0 || data.alertsTriggeredRecently > 0) {
          setStats(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !stats) return null;

  const items = [
    {
      icon: TrendingDown,
      value: stats.priceDropsToday,
      label: `produto${stats.priceDropsToday !== 1 ? "s" : ""} caiu de preco hoje`,
      color: "text-accent-green",
      bgColor: "bg-accent-green/10",
      show: stats.priceDropsToday > 0,
    },
    {
      icon: Plus,
      value: stats.newOffersToday,
      label: `nova${stats.newOffersToday !== 1 ? "s" : ""} oferta${stats.newOffersToday !== 1 ? "s" : ""} adicionada${stats.newOffersToday !== 1 ? "s" : ""}`,
      color: "text-accent-blue",
      bgColor: "bg-accent-blue/10",
      show: stats.newOffersToday > 0,
    },
    {
      icon: Bell,
      value: stats.alertsTriggeredRecently,
      label: `alerta${stats.alertsTriggeredRecently !== 1 ? "s" : ""} disparado${stats.alertsTriggeredRecently !== 1 ? "s" : ""} recentemente`,
      color: "text-accent-orange",
      bgColor: "bg-accent-orange/10",
      show: stats.alertsTriggeredRecently > 0,
    },
  ].filter((item) => item.show);

  if (items.length === 0) return null;

  return (
    <section id="what-changed" className="py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-50 border border-surface-200/60 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-text-muted flex-shrink-0">
            <Activity className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">O que mudou</span>
          </div>
          <div className="w-px h-4 bg-surface-200 flex-shrink-0" />
          <div className="flex items-center gap-4 overflow-x-auto">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${item.bgColor}`}>
                    <Icon className={`h-3 w-3 ${item.color}`} />
                  </div>
                  <span className="text-sm text-text-primary font-bold tabular-nums">
                    {item.value}
                  </span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
