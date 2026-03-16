import { runAllHealthChecks } from '@/lib/health/checks'
import type { HealthCheckResult, HealthStatus } from '@/lib/health/types'
import prisma from '@/lib/db/prisma'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  Key,
  Mail,
  Server,
  Timer,
  XCircle,
  Info,
  Package,
  Tag,
  Users,
  Search,
  Lightbulb,
  BarChart3,
} from 'lucide-react'
import {
  toSeverity,
  severityBadge,
  severityCard,
  severityGradient,
  severityIconBg,
  severitySolid,
  type Severity,
} from '@/lib/admin/severity'

export const dynamic = 'force-dynamic'

/** Map HealthStatus → Severity */
function healthToSeverity(status: HealthStatus): Severity {
  return toSeverity(status)
}

const iconMap: Record<string, typeof Activity> = {
  Database: Database,
  Sources: Globe,
  Jobs: Timer,
  Sitemap: Server,
  'Email / Resend': Mail,
  'Cron Readiness': Timer,
  'Critical Env Vars': Key,
  'Build / Runtime': Server,
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  if (status === 'degraded') return <AlertTriangle className="h-5 w-5 text-amber-500" />
  return <XCircle className="h-5 w-5 text-red-500" />
}

function operationalGuidance(check: HealthCheckResult): string | null {
  if (check.status === 'healthy') return null
  const name = check.name.toLowerCase()
  if (name.includes('database'))
    return 'Verifique DATABASE_URL e conectividade de rede. Sem banco, nenhuma funcionalidade opera.'
  if (name.includes('source'))
    return 'Nenhuma fonte ativa. Acesse /admin/fontes e ative pelo menos uma fonte para ingestão.'
  if (name.includes('job'))
    return 'Jobs falhando indicam problemas de dados ou conectividade. Verifique os logs em /admin/monitoring.'
  if (name.includes('sitemap'))
    return 'Sitemap não gerado. Execute o job de sitemap manualmente em /admin/jobs ou aguarde o próximo cron.'
  if (name.includes('email') || name.includes('resend'))
    return 'Sem RESEND_API_KEY, emails não serão enviados. Crie conta em resend.com e configure.'
  if (name.includes('cron'))
    return 'Sem CRON_SECRET, jobs agendados não executam. Preços e scores ficam desatualizados.'
  if (name.includes('env'))
    return 'Variáveis de ambiente críticas ausentes. Acesse /admin/config para ver quais faltam.'
  if (name.includes('build') || name.includes('runtime'))
    return 'Problema no build ou runtime. Verifique os logs do deploy e o NODE_ENV.'
  return null
}

function CheckCard({ check }: { check: HealthCheckResult }) {
  const Icon = iconMap[check.name] || Activity
  const sev = healthToSeverity(check.status)
  const guidance = operationalGuidance(check)

  return (
    <div
      className={`rounded-xl border p-4 ${severityCard(sev)} transition-shadow hover:shadow-md`}
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
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severitySolid(sev)}`}
        >
          {check.status}
        </span>
        <span className="text-[10px] uppercase tracking-wider opacity-60">
          severity: {check.severity}
        </span>
      </div>
      {guidance && (
        <div className="flex items-start gap-1.5 mt-3 pt-2 border-t border-current/10">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-60" />
          <p className="text-[10px] opacity-70 leading-relaxed">{guidance}</p>
        </div>
      )}
    </div>
  )
}

async function getCatalogStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    products, offers, listings, subscribers,
    clickouts, alerts, activeAlerts, searchLogs,
  ] = await Promise.all([
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.offer.count({ where: { isActive: true } }),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.clickout.count(),
    prisma.priceAlert.count(),
    prisma.priceAlert.count({ where: { isActive: true, triggeredAt: null } }),
    prisma.searchLog.count(),
  ])

  // Service configuration status
  const services = {
    email: !!process.env.RESEND_API_KEY ? 'configured' as const : 'missing' as const,
    cron: !!process.env.CRON_SECRET ? 'configured' as const : 'open_mode' as const,
    ml: !!(
      (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
      (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
    ) ? 'configured' as const : 'missing' as const,
    analytics: !!process.env.NEXT_PUBLIC_GA_ID ? 'configured' as const : 'missing' as const,
  }

  // Job coverage
  const expectedJobs = ['ingest-ml-trends', 'update-prices', 'compute-scores', 'discover-import', 'cleanup-data', 'check-alerts', 'generate-sitemap']
  const recentJobs = await prisma.jobRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 30,
    select: { jobName: true, status: true, startedAt: true, durationMs: true },
  })
  const lastByJob: Record<string, { status: string; startedAt: Date; durationMs: number | null }> = {}
  for (const j of recentJobs) {
    if (!lastByJob[j.jobName]) lastByJob[j.jobName] = j
  }
  const jobCoverage = expectedJobs.map(name => ({
    job: name,
    hasRun: !!lastByJob[name],
    lastStatus: lastByJob[name]?.status ?? 'never',
    lastRunAt: lastByJob[name]?.startedAt ?? null,
    durationMs: lastByJob[name]?.durationMs ?? null,
  }))

  // Recommendations
  const recommendations: string[] = []
  if (services.email === 'missing') recommendations.push('Configurar RESEND_API_KEY para envio de emails')
  if (services.ml === 'missing') recommendations.push('Configurar credenciais ML para discovery automático')
  if (services.analytics === 'missing') recommendations.push('Configurar NEXT_PUBLIC_GA_ID para analytics')
  if (services.cron === 'open_mode') recommendations.push('CRON_SECRET não configurado — cron acessível sem auth')
  if (subscribers === 0) recommendations.push('Nenhum subscriber ativo — captar assinantes')
  if (activeAlerts === 0) recommendations.push('Nenhum alerta ativo — promover funcionalidade para usuários')
  if (clickouts === 0) recommendations.push('Nenhum clickout registrado — verificar tracking')
  if (Object.keys(lastByJob).length === 0) recommendations.push('Nenhum job executado — rodar cron manualmente')

  return {
    catalog: { products, offers, listings, subscribers, clickouts, alerts, activeAlerts, searchLogs },
    services,
    jobCoverage,
    recommendations,
  }
}

function CatalogStatItem({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-surface-200 bg-white p-3">
      <Icon className="h-4 w-4 text-text-muted flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-lg font-bold font-display text-text-primary">{value.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  )
}

function ServiceStatusDot({ status }: { status: string }) {
  const color = status === 'configured' ? 'bg-emerald-500' : status === 'open_mode' ? 'bg-amber-500' : 'bg-red-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default async function HealthPage() {
  const [report, extra] = await Promise.all([
    runAllHealthChecks(),
    getCatalogStats(),
  ])

  const overallSev = healthToSeverity(report.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            System Health
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Painel de diagnóstico em tempo real do sistema
          </p>
        </div>
        <div className="text-xs text-text-muted">
          Verificado: {new Date(report.timestamp).toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${severityGradient(overallSev)} p-6 text-white shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Status Geral do Sistema</p>
              <p className="text-3xl font-bold font-display uppercase tracking-wide">
                {report.status === 'healthy'
                  ? 'Saudável'
                  : report.status === 'degraded'
                    ? 'Degradado'
                    : 'Crítico'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{report.summary.healthy}</p>
              <p className="text-xs opacity-80">OK</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.degraded}</p>
              <p className="text-xs opacity-80">Alerta</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.critical}</p>
              <p className="text-xs opacity-80">Crítico</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services Status */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Server className="h-4 w-4" /> Serviços
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(extra.services).map(([name, status]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white p-3">
              <ServiceStatusDot status={status} />
              <div>
                <p className="text-sm font-medium text-text-primary capitalize">{name === 'ml' ? 'ML / Mercado Livre' : name}</p>
                <p className="text-[10px] text-text-muted">{status === 'configured' ? 'Configurado' : status === 'open_mode' ? 'Modo aberto' : 'Não configurado'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog Stats */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Catálogo
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <CatalogStatItem icon={Package} label="Produtos ativos" value={extra.catalog.products} />
          <CatalogStatItem icon={Tag} label="Ofertas ativas" value={extra.catalog.offers} />
          <CatalogStatItem icon={Globe} label="Listings ativos" value={extra.catalog.listings} />
          <CatalogStatItem icon={Users} label="Assinantes" value={extra.catalog.subscribers} />
          <CatalogStatItem icon={Activity} label="Clickouts" value={extra.catalog.clickouts} />
          <CatalogStatItem icon={Mail} label="Alertas de preço" value={extra.catalog.alerts} />
          <CatalogStatItem icon={CheckCircle2} label="Alertas ativos" value={extra.catalog.activeAlerts} />
          <CatalogStatItem icon={Search} label="Buscas registradas" value={extra.catalog.searchLogs} />
        </div>
      </div>

      {/* Job Coverage */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <Timer className="h-4 w-4" /> Cobertura de Jobs
        </h2>
        <div className="rounded-xl border border-surface-200 bg-white divide-y divide-surface-100">
          {extra.jobCoverage.map((jc) => (
            <div key={jc.job} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${jc.lastStatus === 'SUCCESS' ? 'bg-emerald-500' : jc.lastStatus === 'FAILED' ? 'bg-red-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-text-primary flex-1 font-mono">{jc.job}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${jc.lastStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : jc.lastStatus === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                {jc.lastStatus === 'never' ? 'Nunca executou' : jc.lastStatus}
              </span>
              {jc.lastRunAt && (
                <span className="text-[10px] text-text-muted">
                  {new Date(jc.lastRunAt).toLocaleString('pt-BR')}
                </span>
              )}
              {jc.durationMs != null && (
                <span className="text-[10px] text-text-muted">
                  {jc.durationMs > 1000 ? `${(jc.durationMs / 1000).toFixed(1)}s` : `${jc.durationMs}ms`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Critical Items First */}
      {report.checks.some((c) => c.status === 'critical') && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Problemas Críticos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.checks
              .filter((c) => c.status === 'critical')
              .map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
          </div>
        </div>
      )}

      {/* Degraded Items */}
      {report.checks.some((c) => c.status === 'degraded') && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Alertas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.checks
              .filter((c) => c.status === 'degraded')
              .map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
          </div>
        </div>
      )}

      {/* All Checks Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          Todos os Checks ({report.summary.total})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {report.checks.map((check) => (
            <CheckCard key={check.name} check={check} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {extra.recommendations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Recomendações
          </h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <ul className="space-y-2">
              {extra.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
