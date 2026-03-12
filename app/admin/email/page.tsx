import {
  Mail, Users, UserCheck, UserX, Clock, Send, Megaphone,
  ArrowRight, MailCheck, MailX,
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const [
    totalSubscribers,
    activeSubscribers,
    unsubscribed,
    recentSignups,
    totalEmails,
    sentEmails,
    failedEmails,
    recentLogs,
  ] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
    prisma.subscriber.count({ where: { status: "UNSUBSCRIBED" } }),
    prisma.subscriber.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.emailLog.count(),
    prisma.emailLog.count({ where: { status: "sent" } }),
    prisma.emailLog.count({ where: { status: "failed" } }),
    prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 10,
    }),
  ]);

  const statCards = [
    { label: "Total Inscritos", value: formatNumber(totalSubscribers), icon: Users, color: "text-accent-blue" },
    { label: "Ativos", value: formatNumber(activeSubscribers), icon: UserCheck, color: "text-accent-green" },
    { label: "Cancelados", value: formatNumber(unsubscribed), icon: UserX, color: "text-red-500" },
    { label: "E-mails Enviados", value: formatNumber(totalEmails), icon: Mail, color: "text-accent-purple" },
    { label: "Entregues", value: formatNumber(sentEmails), icon: MailCheck, color: "text-accent-green" },
    { label: "Falharam", value: formatNumber(failedEmails), icon: MailX, color: "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            E-mail Marketing
          </h1>
          <p className="text-sm text-text-muted">
            Gerencie assinantes e campanhas de e-mail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/api/cron/daily-deals"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-accent-blue to-brand-500 text-white text-sm font-semibold hover:shadow-glow transition-all"
          >
            <Send className="w-4 h-4" />
            Enviar Daily Deals
          </Link>
          <Link
            href="/admin/email"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-200 bg-white text-text-primary text-sm font-semibold hover:bg-surface-50 transition-colors"
          >
            <Megaphone className="w-4 h-4" />
            Enviar Campanha
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-surface-200 bg-white p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-accent-green" />
              Inscritos Recentes
            </h2>
            <span className="text-xs text-text-muted">
              Ultimos 10
            </span>
          </div>
          <div className="divide-y divide-surface-100">
            {recentSignups.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Nenhum inscrito ainda.
              </div>
            )}
            {recentSignups.map((sub) => (
              <div
                key={sub.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {sub.email}
                  </p>
                  <p className="text-xs text-text-muted">
                    via {sub.source}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  {timeAgo(sub.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent email logs */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Mail className="w-4 h-4 text-accent-purple" />
              Log de E-mails
            </h2>
            <span className="text-xs text-text-muted">
              Ultimos 10
            </span>
          </div>
          <div className="divide-y divide-surface-100">
            {recentLogs.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                Nenhum e-mail enviado ainda.
              </div>
            )}
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {log.subject}
                  </p>
                  <p className="text-xs text-text-muted truncate">
                    Para: {log.to} &middot; Template: {log.template}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      log.status === "sent"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status === "sent" ? "Enviado" : "Falhou"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {timeAgo(log.sentAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
