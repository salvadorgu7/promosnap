import { Package, Tag, Store, MousePointerClick, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const stats = [
  { label: "Produtos", value: "0", icon: Package, trend: "+0 hoje" },
  { label: "Ofertas Ativas", value: "0", icon: Tag, trend: "+0 hoje" },
  { label: "Fontes Ativas", value: "4", icon: Store, trend: "Amazon, ML, Shopee, Shein" },
  { label: "Clickouts Hoje", value: "0", icon: MousePointerClick, trend: "\u2014" },
];

const jobs = [
  { name: "Ingestão", status: "pending", time: "Aguardando primeira execução" },
  { name: "Repricing", status: "pending", time: "Aguardando primeira execução" },
  { name: "Rematch", status: "pending", time: "Aguardando primeira execução" },
  { name: "Sitemap", status: "pending", time: "Aguardando primeira execução" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-surface-900">Dashboard</h1>
        <p className="text-sm text-surface-500">Visão geral do PromoSnap</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="h-4 w-4 text-surface-400" />
              <span className="text-xs text-surface-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-surface-900">{s.value}</p>
            <p className="text-xs text-surface-500 mt-1">{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <h2 className="text-lg font-semibold font-display text-surface-900 mb-4">Jobs Recentes</h2>
        <div className="space-y-2">
          {jobs.map((j) => (
            <div key={j.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-100">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-surface-400" />
                <div>
                  <p className="text-sm font-medium text-surface-900">{j.name}</p>
                  <p className="text-xs text-surface-500">{j.time}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-surface-200 text-surface-500">Pendente</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 border-accent-blue/20 bg-accent-blue/5">
        <h2 className="text-lg font-semibold font-display text-surface-900 mb-3">🚀 Próximos Passos</h2>
        <div className="space-y-2 text-sm text-surface-600">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-accent-green mt-0.5 flex-shrink-0" />
            <span>Projeto criado com Next.js 15 + Prisma + Tailwind</span>
          </div>
          {["Configurar DATABASE_URL no .env.local", "Rodar prisma db push", "Rodar npm run db:seed", "Configurar credenciais de afiliados"].map((step) => (
            <div key={step} className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-accent-orange mt-0.5 flex-shrink-0" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
