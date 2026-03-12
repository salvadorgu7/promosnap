"use client";

import dynamic from "next/dynamic";

const PriceChart = dynamic(() => import("@/components/charts/PriceChart"), {
  ssr: false,
  loading: () => (
    <div className="card p-4 flex items-center justify-center text-text-muted text-sm" style={{ height: 220 }}>
      Carregando grafico...
    </div>
  ),
});

export default PriceChart;
