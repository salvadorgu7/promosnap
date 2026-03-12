import { runRuntimeQA } from "@/lib/runtime/qa";
import type { RuntimeCheck, RuntimeReport } from "@/lib/runtime/qa";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  Shield,
  Database,
  Router,
} from "lucide-react";

export const dynamic = "force-dynamic";

const statusColor: Record<RuntimeCheck["status"], string> = {
  pass: "text-emerald-600 bg-emerald-50 border-emerald-200",
  warn: "text-amber-600 bg-amber-50 border-amber-200",
  fail: "text-red-600 bg-red-50 border-red-200",
};

const statusBadge: Record<RuntimeCheck["status"], string> = {
  pass: "bg-emerald-500",
  warn: "bg-amber-500",
  fail: "bg-red-500",
};

const categoryIcon: Record<string, typeof Activity> = {
  routes: Globe,
  api: Router,
  security: Shield,
  data: Database,
};

const categoryLabel: Record<string, string> = {
  routes: "Routes & Pages",
  api: "API Endpoints",
  security: "Security",
  data: "Data Integrity",
};

function StatusIcon({ status }: { status: RuntimeCheck["status"] }) {
  if (status === "pass")
    return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === "warn")
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function CheckCard({ check }: { check: RuntimeCheck }) {
  const Icon = categoryIcon[check.category] || Activity;
  return (
    <div
      className={`rounded-xl border p-4 ${statusColor[check.status]} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{check.name}</h3>
            <p className="text-xs mt-0.5 opacity-80">{check.message}</p>
          </div>
        </div>
        <StatusIcon status={check.status} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ${statusBadge[check.status]}`}
        >
          {check.status}
        </span>
        <span className="text-[10px] uppercase tracking-wider opacity-60">
          {check.category}
        </span>
        {check.details && (
          <span className="text-[10px] opacity-50 ml-auto">{check.details}</span>
        )}
      </div>
    </div>
  );
}

export default async function RuntimeQAPage() {
  const report: RuntimeReport = await runRuntimeQA();

  const overallColor: Record<RuntimeReport["overall"], string> = {
    pass: "from-emerald-500 to-emerald-600",
    warn: "from-amber-500 to-amber-600",
    fail: "from-red-500 to-red-600",
  };

  const overallLabel: Record<RuntimeReport["overall"], string> = {
    pass: "ALL CHECKS PASSING",
    warn: "WARNINGS DETECTED",
    fail: "FAILURES DETECTED",
  };

  const categories = ["routes", "api", "security", "data"] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Runtime QA
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Automated quality checks for routes, APIs, security and data integrity
          </p>
        </div>
        <div className="text-xs text-text-muted">
          Checked: {new Date(report.timestamp).toLocaleString("pt-BR")}
        </div>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${overallColor[report.overall]} p-6 text-white shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Runtime Status</p>
              <p className="text-3xl font-bold font-display uppercase tracking-wide">
                {overallLabel[report.overall]}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{report.summary.pass}</p>
              <p className="text-xs opacity-80">Pass</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.warn}</p>
              <p className="text-xs opacity-80">Warn</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.fail}</p>
              <p className="text-xs opacity-80">Fail</p>
            </div>
          </div>
        </div>
      </div>

      {/* Failures First */}
      {report.checks.some((c) => c.status === "fail") && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Failures
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.checks
              .filter((c) => c.status === "fail")
              .map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {report.checks.some((c) => c.status === "warn") && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Warnings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.checks
              .filter((c) => c.status === "warn")
              .map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
          </div>
        </div>
      )}

      {/* By Category */}
      {categories.map((cat) => {
        const catChecks = report.checks.filter((c) => c.category === cat);
        if (catChecks.length === 0) return null;
        const CatIcon = categoryIcon[cat] || Activity;
        return (
          <div key={cat} className="space-y-2">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <CatIcon className="h-4 w-4" /> {categoryLabel[cat]} ({catChecks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {catChecks.map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
