import {
  Settings,
  Database,
  CheckCircle,
  XCircle,
  Globe,
  Key,
  DollarSign,
  BarChart3,
  Play,
  ExternalLink,
  Shield,
  Mail,
  Cpu,
  Clock,
  Server,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import { existsSync } from "fs";
import { ML_TOKEN_PATH } from "@/lib/constants/ml-token-path";

export const dynamic = "force-dynamic";

interface EnvCheck {
  name: string;
  configured: boolean;
  required: boolean;
  group: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        ok
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-600"
      }`}
    >
      {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label || (ok ? "Configured" : "Missing")}
    </span>
  );
}

export default async function AdminConfigPage() {
  // ── DB connection ──
  let dbConnected = false;
  let dbProductCount = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    dbProductCount = await prisma.product.count();
  } catch {}

  // ── ML auth status ──
  let mlTokenExists = false;
  try {
    mlTokenExists = existsSync(ML_TOKEN_PATH);
  } catch {}

  // ── ENV checks ──
  const envChecks: EnvCheck[] = [
    { name: "DATABASE_URL", configured: !!process.env.DATABASE_URL, required: true, group: "Core" },
    { name: "ADMIN_SECRET", configured: !!process.env.ADMIN_SECRET, required: true, group: "Core" },
    { name: "CRON_SECRET", configured: !!process.env.CRON_SECRET, required: true, group: "Core" },
    { name: "ML_CLIENT_ID", configured: !!process.env.MERCADOLIVRE_CLIENT_ID, required: false, group: "Integrations" },
    { name: "ML_CLIENT_SECRET", configured: !!process.env.MERCADOLIVRE_CLIENT_SECRET, required: false, group: "Integrations" },
    { name: "RESEND_API_KEY", configured: !!process.env.RESEND_API_KEY, required: false, group: "Integrations" },
    { name: "NEXT_PUBLIC_APP_URL", configured: !!process.env.NEXT_PUBLIC_APP_URL, required: false, group: "App" },
    { name: "APP_URL", configured: !!process.env.APP_URL, required: false, group: "App" },
    { name: "NEXT_PUBLIC_GA_ID", configured: !!process.env.NEXT_PUBLIC_GA_ID, required: false, group: "App" },
  ];

  const configuredCount = envChecks.filter((e) => e.configured).length;
  const requiredMissing = envChecks.filter((e) => e.required && !e.configured);

  // ── Canonical domain ──
  const canonicalDomain =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "(not set)";

  // ── Runtime info ──
  const nodeEnv = process.env.NODE_ENV || "unknown";

  // ── Revenue sources ──
  let sourceCount = 0;
  try {
    sourceCount = await prisma.source.count({ where: { status: "ACTIVE" } });
  } catch {}

  // ── DB stats ──
  let dbStats: { table: string; count: number }[] = [];
  try {
    const [products, offers, listings, clickouts, alerts, subscribers] =
      await Promise.all([
        prisma.product.count(),
        prisma.offer.count(),
        prisma.listing.count(),
        prisma.clickout.count(),
        prisma.priceAlert.count(),
        prisma.subscriber.count(),
      ]);
    dbStats = [
      { table: "Produtos", count: products },
      { table: "Ofertas", count: offers },
      { table: "Listings", count: listings },
      { table: "Clickouts", count: clickouts },
      { table: "Alertas", count: alerts },
      { table: "Assinantes", count: subscribers },
    ];
  } catch {}

  const quickActions = [
    { label: "Executar Jobs", href: "/admin/jobs", icon: Play },
    { label: "Ver Sitemap", href: "/sitemap.xml", icon: Globe },
    { label: "Ingestao", href: "/admin/ingestao", icon: ExternalLink },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Settings className="h-6 w-6 text-text-muted" />
          Sistema &amp; Configuracoes
        </h1>
        <p className="text-sm text-text-muted">
          Status do ambiente, seguranca, banco de dados e integracoes
        </p>
      </div>

      {/* ── Top status cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DB */}
        <div className={`card p-5 ${dbConnected ? "bg-green-50" : "bg-red-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Database className={`h-4 w-4 ${dbConnected ? "text-accent-green" : "text-red-500"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">Banco de Dados</span>
          </div>
          <div className="flex items-center gap-2">
            {dbConnected ? (
              <CheckCircle className="h-5 w-5 text-accent-green" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <p className={`text-lg font-bold font-display ${dbConnected ? "text-accent-green" : "text-red-500"}`}>
              {dbConnected ? "Conectado" : "Desconectado"}
            </p>
          </div>
          {dbConnected && (
            <p className="text-xs text-text-muted mt-1">
              {dbProductCount.toLocaleString("pt-BR")} produtos
            </p>
          )}
        </div>

        {/* ML Auth */}
        <div className={`card p-5 ${mlTokenExists ? "bg-green-50" : "bg-yellow-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-4 w-4 ${mlTokenExists ? "text-accent-green" : "text-yellow-600"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">ML Auth</span>
          </div>
          <StatusBadge ok={mlTokenExists} label={mlTokenExists ? "Token ativo" : "Sem token"} />
        </div>

        {/* Cron */}
        <div className={`card p-5 ${process.env.CRON_SECRET ? "bg-green-50" : "bg-red-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`h-4 w-4 ${process.env.CRON_SECRET ? "text-accent-green" : "text-red-500"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">Cron</span>
          </div>
          <StatusBadge ok={!!process.env.CRON_SECRET} />
        </div>

        {/* Email */}
        <div className={`card p-5 ${process.env.RESEND_API_KEY ? "bg-green-50" : "bg-yellow-50"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Mail className={`h-4 w-4 ${process.env.RESEND_API_KEY ? "text-accent-green" : "text-yellow-600"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">Email</span>
          </div>
          <StatusBadge ok={!!process.env.RESEND_API_KEY} label={process.env.RESEND_API_KEY ? "Resend ativo" : "Nao configurado"} />
        </div>
      </div>

      {/* ── Build / Runtime ── */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-text-muted" />
          Runtime &amp; Build
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">NODE_ENV</p>
            <p className="font-mono text-text-primary">{nodeEnv}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Next.js</p>
            <p className="font-mono text-text-primary">15.x</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Canonical Domain</p>
            <p className="font-mono text-text-primary truncate">{canonicalDomain}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Sources</p>
            <p className="font-mono text-text-primary">{sourceCount} ativas</p>
          </div>
        </div>
      </div>

      {/* ── ENV Status table ── */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-text-muted" />
          Variaveis de Ambiente ({configuredCount}/{envChecks.length})
        </h2>
        {requiredMissing.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <strong>Atencao:</strong> {requiredMissing.length} variavel(is) obrigatoria(s) ausente(s):{" "}
            {requiredMissing.map((e) => e.name).join(", ")}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Variavel
                </th>
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Grupo
                </th>
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {envChecks.map((env) => (
                <tr key={env.name} className="border-b border-surface-100 last:border-0">
                  <td className="py-2.5 px-3">
                    <code className="text-xs font-mono bg-surface-100 px-1.5 py-0.5 rounded text-text-primary">
                      {env.name}
                    </code>
                    {env.required && (
                      <span className="ml-1.5 text-[10px] text-accent-red font-medium">obrigatoria</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs text-text-muted">{env.group}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge ok={env.configured} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DB Stats ── */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-text-muted" />
          Status do Banco
        </h2>
        {dbStats.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {dbStats.map((stat) => (
              <div
                key={stat.table}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
              >
                <p className="text-sm text-text-secondary">{stat.table}</p>
                <p className="text-sm font-bold font-display text-text-primary">
                  {stat.count.toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            {dbConnected ? "Nenhum dado encontrado." : "Banco desconectado."}
          </p>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-text-muted" />
          Acoes Rapidas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors text-center"
              >
                <Icon className="h-5 w-5 text-accent-blue" />
                <span className="text-xs font-medium text-text-secondary">{action.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
