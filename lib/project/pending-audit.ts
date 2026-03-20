/**
 * Pending Audit Module
 *
 * Classifies all known pending items into priority groups
 * and identifies current system bottlenecks.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type PendingGroup =
  | "critical_for_execution"
  | "important_not_blocking"
  | "future";

export type PendingStatus = "open" | "partial" | "closed";

export type BottleneckSeverity = "critical" | "warning" | "info";

export interface PendingItem {
  id: string;
  title: string;
  description: string;
  group: PendingGroup;
  status: PendingStatus;
  blockedBy?: string;
  estimatedEffort: string;
}

export interface SystemBottleneck {
  area: string;
  description: string;
  severity: BottleneckSeverity;
  recommendation: string;
}

export interface PendingAuditResult {
  critical_for_execution: PendingItem[];
  important_not_blocking: PendingItem[];
  future: PendingItem[];
  totalOpen: number;
  totalPartial: number;
  totalClosed: number;
}

// ─── Pending Items Registry ──────────────────────────────────────────────────

const PENDING_ITEMS: PendingItem[] = [
  // ── Critical for Execution ─────────────────────────────────────────────────
  {
    id: "adapter-real-feeds",
    title: "Adapters com feeds reais",
    description:
      "Amazon, Shopee, Shein adapters sao stubs. Precisam de integracao real com APIs de afiliados para ingestao automatica de produtos.",
    group: "critical_for_execution",
    status: "partial",
    estimatedEffort: "3-5 dias por adapter",
  },
  {
    id: "ml-feed-sync",
    title: "Sincronizacao real com Mercado Livre",
    description:
      "O adapter ML esta funcional mas depende de token OAuth valido e cron ativo para sincronizar catalogo continuamente.",
    group: "critical_for_execution",
    status: "partial",
    estimatedEffort: "1-2 dias",
  },
  {
    id: "search-endpoint",
    title: "Endpoint de busca funcional",
    description:
      "Implementado com full-text search, intent analysis, fallbacks e zero-result handling. Dados dependem de catalogo populado.",
    group: "critical_for_execution",
    status: "closed",
    estimatedEffort: "0",
  },
  {
    id: "trending-endpoint",
    title: "Endpoint de trending funcional",
    description:
      "Implementado com monetization scoring, category inference e catalog coverage. Dados dependem de TrendingKeyword populado via cron.",
    group: "critical_for_execution",
    status: "closed",
    estimatedEffort: "0",
  },
  {
    id: "price-history-endpoint",
    title: "Endpoint de historico de precos",
    description:
      "Implementado com analytics extendido, trend detection, volatility e buy timing. Dados dependem de PriceSnapshot populado via jobs.",
    group: "critical_for_execution",
    status: "closed",
    estimatedEffort: "0",
  },
  {
    id: "cron-production",
    title: "Cron jobs em producao",
    description:
      "Vercel Cron ou scheduler externo precisa estar configurado para rodar jobs automaticamente (ingestao, precos, scores, alertas).",
    group: "critical_for_execution",
    status: "open",
    blockedBy: "adapter-real-feeds",
    estimatedEffort: "1 dia",
  },
  {
    id: "conversion-tracking",
    title: "Tracking de conversao pos-clickout",
    description:
      "Nao ha callback de conversao dos afiliados. Sem isso, revenue estimado e aproximacao baseada em clickouts.",
    group: "critical_for_execution",
    status: "open",
    estimatedEffort: "3-5 dias (depende de cada programa de afiliados)",
  },
  {
    id: "error-monitoring-production",
    title: "Monitoramento de erros em producao",
    description:
      "captureError loga no console. Para producao precisa de Sentry, LogRocket ou similar.",
    group: "critical_for_execution",
    status: "open",
    estimatedEffort: "1 dia",
  },

  // ── Important, Not Blocking ────────────────────────────────────────────────
  {
    id: "cdn-images",
    title: "CDN para imagens de produtos",
    description:
      "Imagens servidas diretamente das fontes. CDN proprio (Cloudflare Images, imgix) melhora performance e confiabilidade.",
    group: "important_not_blocking",
    status: "open",
    estimatedEffort: "2-3 dias",
  },
  {
    id: "e2e-tests",
    title: "Testes E2E automatizados",
    description:
      "Sem testes E2E com Playwright/Cypress. Fluxos criticos (clickout, newsletter, busca) deveriam ter cobertura.",
    group: "important_not_blocking",
    status: "open",
    estimatedEffort: "3-5 dias",
  },
  {
    id: "advanced-auth",
    title: "Autenticacao de usuario avancada",
    description:
      "Admin usa secret simples. Para multi-operador, NextAuth/Clerk com sessoes e RBAC seria necessario.",
    group: "important_not_blocking",
    status: "open",
    estimatedEffort: "3-5 dias",
  },
  {
    id: "email-delivery",
    title: "Entrega de emails transacionais",
    description:
      "Sistema de email existe mas precisa de provider real (Resend, SendGrid) configurado para alertas de preco e newsletter.",
    group: "important_not_blocking",
    status: "partial",
    estimatedEffort: "1-2 dias",
  },
  {
    id: "database-indexes",
    title: "Otimizacao de indices do banco",
    description:
      "Queries complexas (clickouts por dia, trending sem cobertura) podem precisar de indices dedicados em producao.",
    group: "important_not_blocking",
    status: "open",
    estimatedEffort: "1 dia",
  },
  {
    id: "rate-limit-persistent",
    title: "Rate limiting persistente",
    description:
      "Rate limit atual e in-memory. Para multi-instancia, precisa de Redis ou Upstash.",
    group: "important_not_blocking",
    status: "partial",
    estimatedEffort: "1 dia",
  },
  {
    id: "backup-strategy",
    title: "Estrategia de backup do banco",
    description:
      "Sem backup automatizado configurado. Neon/Supabase tem backup nativo mas precisa ser verificado.",
    group: "important_not_blocking",
    status: "open",
    estimatedEffort: "0.5 dia",
  },

  // ── Future / Nice-to-Have ──────────────────────────────────────────────────
  {
    id: "push-notifications",
    title: "Push notifications (Web Push)",
    description:
      "Notificar usuarios via browser push quando preco de produto monitorado cai.",
    group: "future",
    status: "open",
    estimatedEffort: "3-5 dias",
  },
  {
    id: "gamification",
    title: "Gamificacao e pontos",
    description:
      "Sistema de pontos por compartilhamento, reviews, referrals. Aumenta engajamento.",
    group: "future",
    status: "open",
    estimatedEffort: "5-10 dias",
  },
  {
    id: "multi-currency",
    title: "Suporte multi-moeda",
    description:
      "Atualmente tudo em BRL. Multi-moeda permitiria expansao para outros mercados.",
    group: "future",
    status: "open",
    estimatedEffort: "5-7 dias",
  },
  {
    id: "rbac",
    title: "RBAC (Role-Based Access Control)",
    description:
      "Controle granular de permissoes para diferentes operadores do admin.",
    group: "future",
    status: "open",
    blockedBy: "advanced-auth",
    estimatedEffort: "3-5 dias",
  },
  {
    id: "ai-descriptions",
    title: "Descricoes geradas por IA",
    description:
      "Usar LLM para gerar descricoes unicas de produtos a partir dos dados das fontes.",
    group: "future",
    status: "open",
    estimatedEffort: "3-5 dias",
  },
  {
    id: "social-sharing",
    title: "Compartilhamento social avancado",
    description:
      "Cards dinamicos para WhatsApp/Instagram/Twitter com preview de oferta.",
    group: "future",
    status: "open",
    estimatedEffort: "2-3 dias",
  },
  {
    id: "comparison-table",
    title: "Tabela de comparacao de produtos",
    description:
      "Permitir usuario comparar 2-4 produtos lado a lado com specs e precos.",
    group: "future",
    status: "open",
    estimatedEffort: "3-5 dias",
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns all pending items classified into 3 priority groups.
 */
export function classifyCriticalPending(): PendingAuditResult {
  const critical = PENDING_ITEMS.filter(
    (i) => i.group === "critical_for_execution"
  );
  const important = PENDING_ITEMS.filter(
    (i) => i.group === "important_not_blocking"
  );
  const future = PENDING_ITEMS.filter((i) => i.group === "future");

  const all = PENDING_ITEMS;

  return {
    critical_for_execution: critical,
    important_not_blocking: important,
    future,
    totalOpen: all.filter((i) => i.status === "open").length,
    totalPartial: all.filter((i) => i.status === "partial").length,
    totalClosed: all.filter((i) => i.status === "closed").length,
  };
}

/**
 * Returns current system bottlenecks: integration, measurement,
 * operation, and security gaps.
 */
export function getSystemBottlenecks(): SystemBottleneck[] {
  return [
    // Integration readiness gaps
    {
      area: "Integracao",
      description:
        "3 de 4 adapters de fontes (Amazon, Shopee, Shein) sao stubs sem conexao real com APIs de afiliados.",
      severity: "critical",
      recommendation:
        "Priorizar integracao com pelo menos 1 fonte real alem de ML para diversificar catalogo.",
    },
    {
      area: "Integracao",
      description:
        "Endpoints de busca, trending e price-history estao implementados mas dependem de dados populados no banco (catalogo, TrendingKeyword, PriceSnapshot).",
      severity: "warning",
      recommendation:
        "Garantir que cron jobs e adapters estao ativos para popular dados continuamente.",
    },

    // Measurement gaps
    {
      area: "Medicao",
      description:
        "Sem tracking de conversao pos-clickout. Revenue e estimado, nao confirmado.",
      severity: "critical",
      recommendation:
        "Implementar postback/callback de conversao ou integrar com dashboards dos programas de afiliados.",
    },
    {
      area: "Medicao",
      description:
        "Historico de precos (PriceSnapshot) endpoint implementado. Dados dependem de jobs de update-prices ativos.",
      severity: "info",
      recommendation:
        "Verificar que job de update-prices esta a gravar snapshots regularmente.",
    },
    {
      area: "Medicao",
      description:
        "Sem analytics de pagina (GA configuravel mas depende de NEXT_PUBLIC_GA_ID).",
      severity: "warning",
      recommendation:
        "Configurar Google Analytics ou Plausible para metricas de usuario real.",
    },

    // Operation gaps
    {
      area: "Operacao",
      description:
        "Cron jobs nao estao agendados em ambiente de producao. Ingestao e atualizacao de precos sao manuais.",
      severity: "critical",
      recommendation:
        "Configurar Vercel Cron ou scheduler externo com CRON_SECRET para automacao.",
    },
    {
      area: "Operacao",
      description:
        "Monitoramento de erros e via console.log. Sem alertas proativos em producao.",
      severity: "warning",
      recommendation:
        "Integrar Sentry ou similar para captura e alerta de erros em tempo real.",
    },

    // Security gaps
    {
      area: "Seguranca",
      description:
        "Rate limit e in-memory, perdido em restart/multi-instancia.",
      severity: "warning",
      recommendation:
        "Migrar para Redis/Upstash para rate limiting persistente.",
    },
    {
      area: "Seguranca",
      description:
        "Sem backup automatizado verificado para o banco de dados.",
      severity: "info",
      recommendation:
        "Verificar configuracao de backup no provider de banco (Neon/Supabase).",
    },
  ];
}
