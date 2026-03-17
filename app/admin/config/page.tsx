import Link from "next/link";
import {
  Settings,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Globe,
  Key,
  BarChart3,
  Play,
  ExternalLink,
  Shield,
  Mail,
  Cpu,
  Clock,
  Server,
  Info,
  Plug,
  ArrowRight,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
// ML auth token is stored in DB (systemSetting key: "ml_oauth_token")
import {
  toSeverity,
  severityBadge,
  severityText,
  severityBg,
  severityIconBg,
} from "@/lib/admin/severity";
import {
  getAllIntegrationReadiness,
  getActivationScore,
} from "@/lib/integrations/readiness";

export const dynamic = "force-dynamic";

interface EnvCheck {
  name: string;
  configured: boolean;
  required: boolean;
  group: string;
  hint: string;
}

function StatusBadge({ ok, label }: { ok: boolean; label?: string }) {
  const sev = ok ? "ok" : "critical";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${severityBadge(sev)}`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label || (ok ? "Configurado" : "Ausente")}
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

  // ── ML auth status (token stored in DB, not filesystem) ──
  let mlTokenExists = false;
  try {
    const mlToken = await prisma.systemSetting.findUnique({ where: { key: "ml_oauth_token" } });
    mlTokenExists = !!mlToken?.value;
  } catch {}

  // ── ENV checks with operational hints ──
  const envChecks: EnvCheck[] = [
    {
      name: "DATABASE_URL",
      configured: !!process.env.DATABASE_URL,
      required: true,
      group: "Core",
      hint: "String de conexão PostgreSQL. Sem ela, nenhuma funcionalidade de dados funciona.",
    },
    {
      name: "ADMIN_SECRET",
      configured: !!process.env.ADMIN_SECRET,
      required: true,
      group: "Core",
      hint: "Protege o acesso ao painel admin. Defina qualquer string segura.",
    },
    {
      name: "CRON_SECRET",
      configured: !!process.env.CRON_SECRET,
      required: true,
      group: "Core",
      hint: "Autoriza execução dos jobs agendados. Sem ela, cron não executa e preços ficam desatualizados.",
    },
    {
      name: "ML_CLIENT_ID",
      configured: !!process.env.MERCADOLIVRE_CLIENT_ID,
      required: false,
      group: "Integrações",
      hint: "Client ID do app Mercado Livre. Necessário para ingestão de dados reais do ML.",
    },
    {
      name: "ML_CLIENT_SECRET",
      configured: !!process.env.MERCADOLIVRE_CLIENT_SECRET,
      required: false,
      group: "Integrações",
      hint: "Client Secret do app Mercado Livre. Use junto com ML_CLIENT_ID.",
    },
    {
      name: "RESEND_API_KEY",
      configured: !!process.env.RESEND_API_KEY,
      required: false,
      group: "Integrações",
      hint: "Chave da API Resend para envio de emails. Sem ela, alertas de preço por email não serão enviados.",
    },
    {
      name: "NEXT_PUBLIC_APP_URL",
      configured: !!process.env.NEXT_PUBLIC_APP_URL,
      required: false,
      group: "App",
      hint: "URL pública do site (ex: https://promosnap.com.br). Usada para SEO, sitemap e links em emails.",
    },
    {
      name: "APP_URL",
      configured: !!process.env.APP_URL,
      required: false,
      group: "App",
      hint: "URL interna do app. Fallback para NEXT_PUBLIC_APP_URL quando não definida.",
    },
    {
      name: "NEXT_PUBLIC_GA_ID",
      configured: !!process.env.NEXT_PUBLIC_GA_ID,
      required: false,
      group: "App",
      hint: "ID do Google Analytics (ex: G-XXXXXXX). Sem ele, não há tracking de uso.",
    },
  ];

  const configuredCount = envChecks.filter((e) => e.configured).length;
  const requiredMissing = envChecks.filter((e) => e.required && !e.configured);

  // ── Canonical domain ──
  const canonicalDomain =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || null;

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
    { label: "Ingestão", href: "/admin/ingestao", icon: ExternalLink },
  ];

  const hasCron = !!process.env.CRON_SECRET;
  const hasEmail = !!process.env.RESEND_API_KEY;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Settings className="h-6 w-6 text-text-muted" />
          Sistema &amp; Configurações
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Status do ambiente, segurança, banco de dados e integrações
        </p>
      </div>

      {/* ── Critical alerts ── */}
      {requiredMissing.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {requiredMissing.length} variável(is) obrigatória(s) ausente(s)
            </p>
            <ul className="mt-1 space-y-1">
              {requiredMissing.map((e) => (
                <li key={e.name} className="text-xs text-red-700">
                  <code className="font-mono bg-red-100 px-1 py-0.5 rounded">{e.name}</code>
                  {" — "}{e.hint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!hasCron && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Cron não configurado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sem <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">CRON_SECRET</code>, os jobs agendados não executam automaticamente.
              Preços, scores e sitemap não serão atualizados. Configure no painel do Vercel ou no .env.
            </p>
          </div>
        </div>
      )}

      {!hasEmail && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Email não configurado</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Sem <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">RESEND_API_KEY</code>, alertas de preço e notificações por email não serão enviados.
              Crie uma conta em resend.com e adicione a chave ao .env.
            </p>
          </div>
        </div>
      )}

      {!canonicalDomain && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Globe className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Domínio canônico não definido</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sem <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">NEXT_PUBLIC_APP_URL</code>, o sitemap e meta tags SEO usarão URLs relativas.
              Defina o domínio final (ex: https://promosnap.com.br) para SEO correto.
            </p>
          </div>
        </div>
      )}

      {/* ── Top status cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DB */}
        <div className={`rounded-xl border p-5 ${severityBg(toSeverity(dbConnected ? "ok" : "critical"))} ${severityText(toSeverity(dbConnected ? "ok" : "critical"))}`}>
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Banco de Dados</span>
          </div>
          <div className="flex items-center gap-2">
            {dbConnected ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <p className="text-lg font-bold font-display">
              {dbConnected ? "Conectado" : "Desconectado"}
            </p>
          </div>
          {dbConnected && (
            <p className="text-xs text-text-muted mt-1">
              {dbProductCount.toLocaleString("pt-BR")} produtos
            </p>
          )}
          {!dbConnected && (
            <p className="text-xs mt-1 opacity-80">
              Verifique DATABASE_URL e conectividade de rede.
            </p>
          )}
        </div>

        {/* ML Auth */}
        <div className={`rounded-xl border p-5 ${severityBg(toSeverity(mlTokenExists ? "ok" : "warning"))}`}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className={`h-4 w-4 ${mlTokenExists ? "text-emerald-600" : "text-amber-600"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">ML Auth</span>
          </div>
          <StatusBadge ok={mlTokenExists} label={mlTokenExists ? "Token ativo" : "Sem token"} />
          {!mlTokenExists && (
            <p className="text-xs text-amber-700 mt-2">
              Acesse /admin/ml-auth para gerar o token OAuth do Mercado Livre.
            </p>
          )}
        </div>

        {/* Cron */}
        <div className={`rounded-xl border p-5 ${severityBg(toSeverity(hasCron ? "ok" : "critical"))}`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`h-4 w-4 ${hasCron ? "text-emerald-600" : "text-red-500"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">Cron</span>
          </div>
          <StatusBadge ok={hasCron} />
          {!hasCron && (
            <p className="text-xs text-red-600 mt-2">
              Jobs não executam. Defina CRON_SECRET no .env.
            </p>
          )}
        </div>

        {/* Email */}
        <div className={`rounded-xl border p-5 ${severityBg(toSeverity(hasEmail ? "ok" : "info"))}`}>
          <div className="flex items-center gap-2 mb-2">
            <Mail className={`h-4 w-4 ${hasEmail ? "text-emerald-600" : "text-blue-600"}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">Email</span>
          </div>
          <StatusBadge ok={hasEmail} label={hasEmail ? "Resend ativo" : "Não configurado"} />
          {!hasEmail && (
            <p className="text-xs text-blue-600 mt-2">
              Alertas de preço funcionam, mas emails não serão enviados.
            </p>
          )}
        </div>
      </div>

      {/* ── Build / Runtime ── */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
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
            <p className="font-mono text-text-primary truncate">
              {canonicalDomain || <span className="text-amber-600 italic">não definido</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Sources</p>
            <p className="font-mono text-text-primary">{sourceCount} ativas</p>
          </div>
        </div>
      </div>

      {/* ── ENV Status table ── */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-text-muted" />
          Variáveis de Ambiente ({configuredCount}/{envChecks.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Variável
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
                <tr key={env.name} className="border-b border-surface-100 last:border-0 group">
                  <td className="py-2.5 px-3">
                    <div>
                      <code className="text-xs font-mono bg-surface-100 px-1.5 py-0.5 rounded text-text-primary">
                        {env.name}
                      </code>
                      {env.required && (
                        <span className="ml-1.5 text-[10px] text-red-500 font-medium">obrigatória</span>
                      )}
                    </div>
                    {!env.configured && (
                      <p className="text-[10px] text-text-muted mt-0.5 max-w-xs">{env.hint}</p>
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
      <div className="rounded-xl border border-surface-200 bg-white p-5">
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
          <div className="text-center py-6">
            <Database className="h-8 w-8 mx-auto mb-2 text-text-muted opacity-30" />
            <p className="text-sm text-text-muted">
              {dbConnected
                ? "Nenhum dado encontrado. Execute a ingestão para popular o banco."
                : "Banco desconectado. Verifique DATABASE_URL e tente novamente."}
            </p>
          </div>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-text-muted" />
          Ações Rápidas
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
                <Icon className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium text-text-secondary">{action.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* ── Integrações readiness summary ── */}
      <IntegrationReadinessSummary />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration Readiness Summary (inline component)
// ---------------------------------------------------------------------------

function IntegrationReadinessSummary() {
  const integrations = getAllIntegrationReadiness();
  const score = getActivationScore();

  const ready = integrations.filter((i) => i.status === "READY_PRODUCTION").length;
  const partial = integrations.filter(
    (i) => i.status === "CONFIG_PARTIAL" || i.status === "READY_TO_TEST",
  ).length;
  const missing = integrations.filter((i) => i.status === "NOT_CONFIGURED").length;

  const scoreColor =
    score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5">
      <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
        <Plug className="h-4 w-4 text-text-muted" />
        Integrações
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-surface-50 text-center">
          <p className={`text-2xl font-bold font-display ${scoreColor}`}>{score}</p>
          <p className="text-xs text-text-muted">Activation Score</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 text-center">
          <p className="text-2xl font-bold font-display text-emerald-700">{ready}</p>
          <p className="text-xs text-emerald-600">Produção</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 text-center">
          <p className="text-2xl font-bold font-display text-amber-700">{partial}</p>
          <p className="text-xs text-amber-600">Parcial / Teste</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 text-center">
          <p className="text-2xl font-bold font-display text-red-700">{missing}</p>
          <p className="text-xs text-red-600">Não configurado</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/admin/setup"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowRight className="h-4 w-4" />
          Ativação da Plataforma
        </Link>
        <Link
          href="/admin/integrations"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowRight className="h-4 w-4" />
          Painel de Integrações
        </Link>
      </div>
    </div>
  );
}
