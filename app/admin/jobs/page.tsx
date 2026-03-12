import { CheckCircle, XCircle, Loader2, AlertTriangle, Play, Clock, Zap } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { timeAgo } from "@/lib/utils";
import JobRunner from "@/components/admin/JobRunner";

export const dynamic = "force-dynamic";

const JOB_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  ingest: { label: "Ingestão ML", description: "Busca tendências do Mercado Livre e persiste keywords" },
  "update-prices": { label: "Atualizar Preços", description: "Marca ofertas stale e cria snapshots" },
  "compute-scores": { label: "Calcular Scores", description: "Recalcula offerScore e popularityScore" },
  cleanup: { label: "Limpeza", description: "Remove snapshots e logs antigos" },
  sitemap: { label: "Sitemap", description: "Verifica URLs do sitemap dinâmico" },
  "check-alerts": { label: "Alertas de Preço", description: "Verifica e dispara alertas atingidos" },
};

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  SUCCESS: { icon: CheckCircle, color: "text-accent-green", bg: "bg-green-50" },
  FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  RUNNING: { icon: Loader2, color: "text-accent-blue", bg: "bg-blue-50" },
  CANCELLED: { icon: AlertTriangle, color: "text-accent-orange", bg: "bg-orange-50" },
};

export default async function AdminJobsPage() {
  const jobNames = Object.keys(JOB_DESCRIPTIONS);

  // Get latest run for each job
  const latestRuns = await Promise.all(
    jobNames.map(async (name) => {
      const run = await prisma.jobRun.findFirst({
        where: { jobName: name },
        orderBy: { startedAt: "desc" },
      });
      return { name, run };
    })
  );

  // Get full history
  const history = await prisma.jobRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Jobs</h1>
        <p className="text-sm text-text-muted">Sistema de automação e monitoramento</p>
      </div>

      {/* Job cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestRuns.map(({ name, run }) => {
          const desc = JOB_DESCRIPTIONS[name] || { label: name, description: "" };
          const sc = run ? statusConfig[run.status] || statusConfig.CANCELLED : null;
          const StatusIcon = sc?.icon;

          return (
            <div key={name} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent-blue" />
                  <h3 className="font-semibold text-sm text-text-primary">{desc.label}</h3>
                </div>
                {sc && StatusIcon && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
                    <StatusIcon className={`h-3 w-3 ${run?.status === "RUNNING" ? "animate-spin" : ""}`} />
                    {run?.status}
                  </span>
                )}
              </div>

              <p className="text-xs text-text-muted">{desc.description}</p>

              {run && (
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(new Date(run.startedAt))}
                  </span>
                  {run.durationMs != null && (
                    <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                  )}
                  {run.itemsDone != null && (
                    <span>{run.itemsDone}/{run.itemsTotal ?? "?"} items</span>
                  )}
                </div>
              )}

              {!run && (
                <p className="text-xs text-text-muted italic">Nunca executado</p>
              )}

              <JobRunner jobName={name} />
            </div>
          );
        })}
      </div>

      {/* History table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold font-display text-text-primary">Histórico de Execuções</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Job</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Status</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Iniciado</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Duração</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Items</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Erros</th>
              </tr>
            </thead>
            <tbody>
              {history.map((j) => {
                const sc = statusConfig[j.status] || statusConfig.CANCELLED;
                const StatusIcon = sc.icon;
                return (
                  <tr key={j.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2 px-4 font-medium text-text-primary">{j.jobName}</td>
                    <td className="py-2 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
                        <StatusIcon className={`h-3 w-3 ${j.status === "RUNNING" ? "animate-spin" : ""}`} />
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-text-muted text-xs">{timeAgo(new Date(j.startedAt))}</td>
                    <td className="py-2 px-4 text-right text-text-secondary text-xs">
                      {j.durationMs != null ? `${(j.durationMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">
                      {j.itemsDone != null ? `${j.itemsDone}/${j.itemsTotal ?? "?"}` : "—"}
                    </td>
                    <td className="py-2 px-4 text-xs">
                      {j.errorLog ? (
                        <span className="text-red-500 max-w-[200px] truncate block" title={j.errorLog}>
                          {j.errorLog.length > 60 ? j.errorLog.slice(0, 60) + "..." : j.errorLog}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Nenhum job executado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
