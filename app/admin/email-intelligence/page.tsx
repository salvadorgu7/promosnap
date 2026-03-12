import {
  MailCheck,
  Users,
  Bell,
  Clock,
  PieChart,
  TrendingUp,
  MailX,
  Send,
  UserPlus,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import { formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminEmailIntelligencePage() {
  // ---- Data fetching ----
  const [
    totalSubscribers,
    activeSubscribers,
    totalAlerts,
    triggeredAlerts,
    totalEmailsSent,
    totalEmailsFailed,
    recentSignups,
  ] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
    prisma.priceAlert.count(),
    prisma.priceAlert.count({ where: { triggeredAt: { not: null } } }),
    prisma.emailLog.count({ where: { status: "sent" } }),
    prisma.emailLog.count({ where: { status: "failed" } }),
    prisma.subscriber.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  // Subscribers by interest (top interests)
  let interestDistribution: Array<{ interest: string; count: number }> = [];
  try {
    interestDistribution = await prisma.$queryRaw<typeof interestDistribution>`
      SELECT unnest(interests) AS interest, COUNT(*)::int AS count
      FROM subscribers
      WHERE status = 'ACTIVE' AND array_length(interests, 1) > 0
      GROUP BY interest
      ORDER BY count DESC
      LIMIT 10
    `;
  } catch {
    // interests may be empty
  }

  // Subscribers by source
  let sourceDistribution: Array<{ source: string; count: number }> = [];
  try {
    sourceDistribution = await prisma.$queryRaw<typeof sourceDistribution>`
      SELECT source, COUNT(*)::int AS count
      FROM subscribers
      WHERE status = 'ACTIVE'
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `;
  } catch {
    // fallback
  }

  // Subscribers by tag
  let tagDistribution: Array<{ tag: string; count: number }> = [];
  try {
    tagDistribution = await prisma.$queryRaw<typeof tagDistribution>`
      SELECT unnest(tags) AS tag, COUNT(*)::int AS count
      FROM subscribers
      WHERE status = 'ACTIVE' AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `;
  } catch {
    // tags may be empty
  }

  // Email logs by template (top performing)
  let templateStats: Array<{ template: string; total: number; sent_count: number; failed_count: number }> = [];
  try {
    templateStats = await prisma.$queryRaw<typeof templateStats>`
      SELECT
        template,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent_count,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count
      FROM email_logs
      GROUP BY template
      ORDER BY total DESC
      LIMIT 10
    `;
  } catch {
    // fallback
  }

  // ---- Render ----
  const totalEmails = totalEmailsSent + totalEmailsFailed;
  const deliveryRate = totalEmails > 0 ? ((totalEmailsSent / totalEmails) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <MailCheck className="h-6 w-6 text-accent-blue" />
          Email Intelligence
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Visao completa de assinantes, segmentos e performance de email
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Inscritos", value: formatNumber(totalSubscribers), icon: Users, color: "text-accent-blue" },
          { label: "Ativos", value: formatNumber(activeSubscribers), icon: UserPlus, color: "text-accent-green" },
          { label: "Alertas Criados", value: formatNumber(totalAlerts), icon: Bell, color: "text-accent-orange" },
          { label: "Alertas Disparados", value: formatNumber(triggeredAlerts), icon: TrendingUp, color: "text-accent-purple" },
          { label: "Emails Enviados", value: formatNumber(totalEmailsSent), icon: Send, color: "text-accent-green" },
          { label: "Taxa Entrega", value: `${deliveryRate}%`, icon: MailCheck, color: totalEmailsFailed > 0 ? "text-accent-orange" : "text-accent-green" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscribers by Interest */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">Assinantes por Interesse</h2>
          </div>
          <div className="p-5">
            {interestDistribution.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">Nenhum dado de interesse encontrado</p>
            ) : (
              <div className="space-y-3">
                {interestDistribution.map((item) => {
                  const pct = activeSubscribers > 0 ? (item.count / activeSubscribers) * 100 : 0;
                  return (
                    <div key={item.interest}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text-primary font-medium">{item.interest}</span>
                        <span className="text-xs text-text-muted">{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-blue to-brand-500 rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Subscribers by Source */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-purple" />
            <h2 className="text-sm font-semibold text-text-primary">Assinantes por Fonte</h2>
          </div>
          <div className="p-5">
            {sourceDistribution.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">Nenhum dado encontrado</p>
            ) : (
              <div className="space-y-3">
                {sourceDistribution.map((item) => {
                  const pct = activeSubscribers > 0 ? (item.count / activeSubscribers) * 100 : 0;
                  return (
                    <div key={item.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text-primary font-medium">{item.source}</span>
                        <span className="text-xs text-text-muted">{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-purple to-brand-500 rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Subscribers by Tag */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-accent-green" />
            <h2 className="text-sm font-semibold text-text-primary">Assinantes por Tag</h2>
          </div>
          <div className="p-5">
            {tagDistribution.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">Nenhuma tag encontrada</p>
            ) : (
              <div className="space-y-3">
                {tagDistribution.map((item) => {
                  const pct = activeSubscribers > 0 ? (item.count / activeSubscribers) * 100 : 0;
                  return (
                    <div key={item.tag}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-text-primary font-medium">{item.tag}</span>
                        <span className="text-xs text-text-muted">{item.count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-accent-green to-accent-blue rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top performing templates */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-orange" />
            <h2 className="text-sm font-semibold text-text-primary">Templates por Volume</h2>
          </div>
          <div className="divide-y divide-surface-100">
            {templateStats.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Nenhum email enviado ainda
              </div>
            ) : (
              templateStats.map((t) => (
                <div key={t.template} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{t.template}</p>
                    <p className="text-xs text-text-muted">
                      {t.total} enviados
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="flex items-center gap-1 text-xs text-accent-green">
                      <MailCheck className="w-3 h-3" />
                      {t.sent_count}
                    </span>
                    {t.failed_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <MailX className="w-3 h-3" />
                        {t.failed_count}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      <div className="rounded-xl border border-surface-200 bg-white">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent-green" />
            Inscritos Recentes
          </h2>
          <span className="text-xs text-text-muted">Ultimos 15</span>
        </div>
        <div className="divide-y divide-surface-100">
          {recentSignups.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              Nenhum inscrito ainda
            </div>
          ) : (
            recentSignups.map((sub) => (
              <div key={sub.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{sub.email}</p>
                  <p className="text-xs text-text-muted">
                    via {sub.source}
                    {sub.interests.length > 0 && ` · ${sub.interests.join(", ")}`}
                    {sub.tags.length > 0 && ` · Tags: ${sub.tags.join(", ")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-accent-blue">
                    {sub.frequency}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="w-3 h-3" />
                    {timeAgo(sub.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
