import { Prisma } from "@prisma/client"
import prisma from "@/lib/db/prisma"
import { Brain, TrendingUp, Heart, Bell, Users, Repeat } from "lucide-react"

export const dynamic = "force-dynamic"

interface MetricCard {
  label: string
  value: string | number
  change?: string
  icon: typeof Brain
  color: string
}

export default async function HabitLoopsPage() {
  // Fetch key retention/habit metrics
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)

  let returningVisitors = 0
  let totalAlerts = 0
  let triggeredAlerts = 0
  let activeSubscribers = 0
  let weeklyClickouts = 0
  let repeatClickouters = 0
  let clickoutsByDay: Array<{ day: string; count: number }> = []

  try {
    // Returning visitors: sessions with >1 clickout in last 7 days
    const returningResult = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(DISTINCT "sessionId") as count
        FROM "ClickoutLog"
        WHERE "clickedAt" > ${sevenDaysAgo}
        GROUP BY "sessionId"
        HAVING COUNT(*) > 1
      `
    )
    returningVisitors = returningResult.length

    // Total alerts
    const alertsResult = await prisma.$queryRaw<Array<{ total: bigint; triggered: bigint }>>(
      Prisma.sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE "status" = 'TRIGGERED') as triggered
        FROM "PriceAlert"
      `
    )
    if (alertsResult[0]) {
      totalAlerts = Number(alertsResult[0].total)
      triggeredAlerts = Number(alertsResult[0].triggered)
    }

    // Active subscribers
    const subResult = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*) as count FROM "Subscriber" WHERE "isActive" = true
      `
    )
    if (subResult[0]) activeSubscribers = Number(subResult[0].count)

    // Weekly clickouts
    const clickoutsResult = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*) as count FROM "ClickoutLog" WHERE "clickedAt" > ${sevenDaysAgo}
      `
    )
    if (clickoutsResult[0]) weeklyClickouts = Number(clickoutsResult[0].count)

    // Repeat clickouters (users who clicked out on 2+ different products this week)
    const repeatResult = await prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*) as count FROM (
          SELECT "sessionId"
          FROM "ClickoutLog"
          WHERE "clickedAt" > ${sevenDaysAgo}
          GROUP BY "sessionId"
          HAVING COUNT(DISTINCT "offerId") >= 2
        ) sub
      `
    )
    if (repeatResult[0]) repeatClickouters = Number(repeatResult[0].count)

    // Clickouts by day (last 14 days)
    const byDay = await prisma.$queryRaw<Array<{ day: string; count: bigint }>>(
      Prisma.sql`
        SELECT DATE("clickedAt") as day, COUNT(*) as count
        FROM "ClickoutLog"
        WHERE "clickedAt" > ${new Date(now.getTime() - 14 * 86400000)}
        GROUP BY DATE("clickedAt")
        ORDER BY day DESC
      `
    )
    clickoutsByDay = byDay.map(r => ({ day: String(r.day), count: Number(r.count) }))

  } catch {
    // Tables may not exist yet — graceful fallback
  }

  const metrics: MetricCard[] = [
    { label: "Visitantes Recorrentes (7d)", value: returningVisitors, icon: Users, color: "text-accent-blue" },
    { label: "Clickouts (7d)", value: weeklyClickouts, icon: TrendingUp, color: "text-accent-green" },
    { label: "Clickouters Repetidos (7d)", value: repeatClickouters, icon: Repeat, color: "text-accent-purple" },
    { label: "Alertas Criados", value: totalAlerts, icon: Bell, color: "text-accent-orange" },
    { label: "Alertas Disparados", value: triggeredAlerts, icon: Bell, color: "text-accent-green" },
    { label: "Assinantes Ativos", value: activeSubscribers, icon: Heart, color: "text-accent-red" },
  ]

  const maxClickouts = Math.max(...clickoutsByDay.map(d => d.count), 1)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <Brain className="w-5 h-5 text-accent-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Habit Loops</h1>
          <p className="text-sm text-text-muted">Metricas de retencao, recorrencia e engajamento</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-surface-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-xs text-text-muted">{m.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Clickouts by day chart */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-8">
        <h2 className="text-lg font-bold font-display text-text-primary mb-4">
          Clickouts por Dia (14d)
        </h2>
        {clickoutsByDay.length > 0 ? (
          <div className="flex items-end gap-1 h-40">
            {clickoutsByDay.reverse().map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-text-muted">{d.count}</span>
                <div
                  className="w-full bg-accent-blue/20 rounded-t"
                  style={{ height: `${(d.count / maxClickouts) * 100}%`, minHeight: "4px" }}
                />
                <span className="text-[9px] text-text-muted">
                  {new Date(d.day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-8">Sem dados de clickout ainda</p>
        )}
      </div>

      {/* Retention signals summary */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-4">
          Sinais de Retencao
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
            <span className="text-sm text-text-secondary">Taxa de retorno (clickouters repetidos / total)</span>
            <span className="text-sm font-bold text-text-primary">
              {weeklyClickouts > 0 ? `${Math.round((repeatClickouters / weeklyClickouts) * 100)}%` : "\u2014"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
            <span className="text-sm text-text-secondary">Alertas \u2192 Disparados (conversao)</span>
            <span className="text-sm font-bold text-text-primary">
              {totalAlerts > 0 ? `${Math.round((triggeredAlerts / totalAlerts) * 100)}%` : "\u2014"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
            <span className="text-sm text-text-secondary">Assinantes ativos (email)</span>
            <span className="text-sm font-bold text-text-primary">{activeSubscribers}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
