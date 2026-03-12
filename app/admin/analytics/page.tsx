import { Activity, Calendar, Clock } from "lucide-react";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const hourLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}h`);

export default async function AdminAnalyticsPage() {
  // Clickouts by day of week (last 30 days)
  let byDayOfWeek: any[] = [];
  try {
    byDayOfWeek = await prisma.$queryRaw`
      SELECT EXTRACT(DOW FROM "clickedAt")::int AS dow, COUNT(*)::int AS count
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '30 days'
      GROUP BY dow
      ORDER BY dow
    `;
  } catch {}

  // Clickouts by hour (last 30 days)
  let byHour: any[] = [];
  try {
    byHour = await prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM "clickedAt")::int AS hour, COUNT(*)::int AS count
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `;
  } catch {}

  // Heatmap: day of week x hour (last 30 days)
  let heatmapData: any[] = [];
  try {
    heatmapData = await prisma.$queryRaw`
      SELECT
        EXTRACT(DOW FROM "clickedAt")::int AS dow,
        EXTRACT(HOUR FROM "clickedAt")::int AS hour,
        COUNT(*)::int AS count
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '30 days'
      GROUP BY dow, hour
      ORDER BY dow, hour
    `;
  } catch {}

  // Build lookup maps
  const dayMap = new Map<number, number>();
  for (const d of byDayOfWeek) dayMap.set(d.dow, d.count);
  const maxDay = Math.max(...Array.from(dayMap.values()), 1);

  const hourMap = new Map<number, number>();
  for (const h of byHour) hourMap.set(h.hour, h.count);
  const maxHour = Math.max(...Array.from(hourMap.values()), 1);

  // Build heatmap grid [hour][dow]
  const heatGrid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
  for (const cell of heatmapData) {
    heatGrid[cell.hour][cell.dow] = cell.count;
  }
  const maxCell = Math.max(...heatmapData.map((c) => c.count), 1);

  const totalClickouts30d = byDayOfWeek.reduce((sum, d) => sum + d.count, 0);
  const hasData = totalClickouts30d > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Analise</h1>
        <p className="text-sm text-text-muted">Comportamento de clickouts nos ultimos 30 dias</p>
      </div>

      {/* Summary */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-4 w-4 text-accent-blue" />
          <span className="text-xs text-text-muted uppercase tracking-wider">Clickouts 30d</span>
        </div>
        <p className="text-2xl font-bold font-display text-text-primary">{totalClickouts30d.toLocaleString("pt-BR")}</p>
      </div>

      {!hasData ? (
        <div className="card p-8 text-center text-text-muted">
          Nenhum clickout registrado nos ultimos 30 dias.
        </div>
      ) : (
        <>
          {/* By day of week */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-accent-green" />
              <h2 className="font-display font-semibold text-text-primary">Clickouts por Dia da Semana</h2>
            </div>
            <div className="flex items-end gap-3 h-40">
              {Array.from({ length: 7 }, (_, dow) => {
                const count = dayMap.get(dow) ?? 0;
                const pct = (count / maxDay) * 100;
                return (
                  <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-text-primary">{count}</span>
                    <div className="w-full bg-surface-100 rounded-t" style={{ height: "120px" }}>
                      <div
                        className="w-full bg-accent-green rounded-t transition-all"
                        style={{ height: `${Math.max(pct, 2)}%`, marginTop: `${100 - Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-text-muted font-medium">{dayLabels[dow]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By hour */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-accent-orange" />
              <h2 className="font-display font-semibold text-text-primary">Clickouts por Hora</h2>
            </div>
            <div className="flex items-end gap-1 h-40">
              {Array.from({ length: 24 }, (_, hour) => {
                const count = hourMap.get(hour) ?? 0;
                const pct = (count / maxHour) * 100;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-medium text-text-primary">{count || ""}</span>
                    <div className="w-full bg-surface-100 rounded-t" style={{ height: "120px" }}>
                      <div
                        className="w-full bg-accent-orange rounded-t transition-all"
                        style={{ height: `${Math.max(pct, 1)}%`, marginTop: `${100 - Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-text-muted">{hour % 3 === 0 ? hourLabels[hour] : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap */}
          <div className="card p-5">
            <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Mapa de Calor (Dia x Hora)</h2>
            <div className="overflow-x-auto">
              <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `auto repeat(7, 1fr)` }}>
                {/* Header row */}
                <div className="w-10" />
                {dayLabels.map((d) => (
                  <div key={d} className="text-[10px] text-text-muted text-center font-medium px-1">{d}</div>
                ))}

                {/* Hour rows */}
                {Array.from({ length: 24 }, (_, hour) => (
                  <>
                    <div key={`label-${hour}`} className="text-[10px] text-text-muted text-right pr-2 flex items-center justify-end">
                      {hourLabels[hour]}
                    </div>
                    {Array.from({ length: 7 }, (_, dow) => {
                      const count = heatGrid[hour][dow];
                      const intensity = maxCell > 0 ? count / maxCell : 0;
                      // Color from surface-100 to accent-blue with opacity
                      const bgOpacity = Math.max(0.05, intensity);
                      return (
                        <div
                          key={`${hour}-${dow}`}
                          className="w-full aspect-square rounded-sm flex items-center justify-center min-w-[28px]"
                          style={{ backgroundColor: `rgba(59, 130, 246, ${bgOpacity})` }}
                          title={`${dayLabels[dow]} ${hourLabels[hour]}: ${count} clickouts`}
                        >
                          {count > 0 && (
                            <span className={`text-[8px] font-medium ${intensity > 0.5 ? "text-white" : "text-text-secondary"}`}>
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[10px] text-text-muted">
              <span>Menos</span>
              {[0.05, 0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                <div
                  key={opacity}
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
                />
              ))}
              <span>Mais</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
