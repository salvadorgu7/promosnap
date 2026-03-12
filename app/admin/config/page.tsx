import {
  Settings,
  Database,
  CheckCircle,
  XCircle,
  ExternalLink,
  Globe,
  Key,
  DollarSign,
  BarChart3,
  Play,
} from "lucide-react";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

interface EnvVar {
  name: string;
  value: string | undefined;
  masked: string;
  required: boolean;
}

export default async function AdminConfigPage() {
  // Check DB connection
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {}

  // ENV vars check
  const envVars: EnvVar[] = [
    {
      name: "DATABASE_URL",
      value: process.env.DATABASE_URL,
      masked: process.env.DATABASE_URL
        ? `postgres://***:***@${process.env.DATABASE_URL.split("@")[1]?.slice(0, 30) || "***"}...`
        : "",
      required: true,
    },
    {
      name: "APP_URL",
      value: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL,
      masked: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "",
      required: false,
    },
    {
      name: "RESEND_API_KEY",
      value: process.env.RESEND_API_KEY,
      masked: process.env.RESEND_API_KEY
        ? `re_${process.env.RESEND_API_KEY.slice(3, 8)}...${process.env.RESEND_API_KEY.slice(-4)}`
        : "",
      required: false,
    },
    {
      name: "MERCADOLIVRE_CLIENT_ID",
      value: process.env.MERCADOLIVRE_CLIENT_ID,
      masked: process.env.MERCADOLIVRE_CLIENT_ID
        ? `${process.env.MERCADOLIVRE_CLIENT_ID.slice(0, 6)}...`
        : "",
      required: false,
    },
    {
      name: "AMAZON_AFFILIATE_TAG",
      value: process.env.AMAZON_AFFILIATE_TAG,
      masked: process.env.AMAZON_AFFILIATE_TAG || "",
      required: false,
    },
    {
      name: "GA_ID",
      value: process.env.NEXT_PUBLIC_GA_ID || process.env.GA_ID,
      masked: process.env.NEXT_PUBLIC_GA_ID || process.env.GA_ID || "",
      required: false,
    },
  ];

  const setCount = envVars.filter((v) => !!v.value).length;
  const totalCount = envVars.length;

  // Revenue rates per source
  let revenueRates: { name: string; slug: string; config: unknown }[] = [];
  try {
    const sources = await prisma.source.findMany({
      select: { name: true, slug: true, affiliateConfig: true },
      orderBy: { name: "asc" },
    });
    revenueRates = sources.map((s) => ({
      name: s.name,
      slug: s.slug,
      config: s.affiliateConfig,
    }));
  } catch {}

  // DB stats
  let dbStats: { table: string; count: number }[] = [];
  try {
    const [products, offers, listings, clickouts, alerts, subscribers] = await Promise.all([
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
    { label: "Executar Seed", href: "/api/seed", icon: Database },
    { label: "Executar Jobs", href: "/admin/jobs", icon: Play },
    { label: "Ver Sitemap", href: "/sitemap.xml", icon: Globe },
    { label: "Ingestao", href: "/admin/ingestao", icon: ExternalLink },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Settings className="h-6 w-6 text-text-muted" />
          Configuracoes
        </h1>
        <p className="text-sm text-text-muted">
          Status do ambiente, banco de dados e integracoes
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Variaveis ENV</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {setCount}/{totalCount}
          </p>
          <p className="text-xs text-text-muted mt-1">configuradas</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Fontes</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {revenueRates.length}
          </p>
          <p className="text-xs text-text-muted mt-1">integradas</p>
        </div>
      </div>

      {/* ENV Status table */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-text-muted" />
          Variaveis de Ambiente
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Variavel
                </th>
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Status
                </th>
                <th className="text-left py-2 px-3 text-xs text-text-muted uppercase tracking-wider font-medium">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {envVars.map((env) => (
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
                    {env.value ? (
                      <span className="inline-flex items-center gap-1 text-xs text-accent-green font-medium">
                        <CheckCircle className="h-3.5 w-3.5" /> Configurada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-text-muted font-medium">
                        <XCircle className="h-3.5 w-3.5" /> Ausente
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {env.value ? (
                      <code className="text-xs font-mono text-text-secondary">{env.masked}</code>
                    ) : (
                      <span className="text-xs text-text-muted">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue rates */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-text-muted" />
            Comissao por Fonte
          </h2>
          {revenueRates.length > 0 ? (
            <div className="space-y-2">
              {revenueRates.map((source) => {
                const config = source.config as Record<string, unknown> | null;
                const rate = config?.commissionRate || config?.commission_rate;
                return (
                  <div
                    key={source.slug}
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{source.name}</p>
                      <p className="text-xs text-text-muted">{source.slug}</p>
                    </div>
                    <span className="text-sm font-semibold text-accent-blue">
                      {rate ? `${rate}%` : "N/A"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">Nenhuma fonte encontrada.</p>
          )}
        </div>

        {/* DB Stats */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            Status do Banco
          </h2>
          {dbStats.length > 0 ? (
            <div className="space-y-2">
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
      </div>

      {/* Quick actions */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <Play className="h-4 w-4 text-text-muted" />
          Acoes Rapidas
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
