import { CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { getAdminJobRuns } from "@/lib/db/queries";
import { timeAgo } from "@/lib/utils";
import JobActions from "@/components/admin/JobActions";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  SUCCESS: { icon: CheckCircle, color: "text-accent-green", bg: "bg-green-50" },
  FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  RUNNING: { icon: Loader2, color: "text-accent-blue", bg: "bg-blue-50" },
  CANCELLED: { icon: AlertTriangle, color: "text-accent-orange", bg: "bg-orange-50" },
};

export default async function AdminJobsPage() {
  const jobRuns = await getAdminJobRuns(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Jobs</h1>
        <p className="text-sm text-text-muted">Historico de execucoes e acoes manuais</p>
      </div>

      <JobActions />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold font-display text-text-primary">Historico de Execucoes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Job</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Status</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Iniciado</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Finalizado</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Total</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Feitos</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Erros</th>
              </tr>
            </thead>
            <tbody>
              {jobRuns.map((j: any) => {
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
                    <td className="py-2 px-4 text-text-muted text-xs">
                      {j.endedAt ? timeAgo(new Date(j.endedAt)) : "—"}
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">{j.itemsTotal ?? "—"}</td>
                    <td className="py-2 px-4 text-right text-text-secondary">{j.itemsDone ?? "—"}</td>
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
              {jobRuns.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    Nenhum job executado.
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
