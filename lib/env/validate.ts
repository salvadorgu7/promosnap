/**
 * Environment Variable Validation
 *
 * Checks that required env vars are present and warns about optional ones.
 * Used at startup and in admin health checks.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type EnvStatus = "ok" | "missing" | "warning";

export interface EnvCheckResult {
  key: string;
  label: string;
  required: boolean;
  status: EnvStatus;
  message: string;
}

export interface EnvValidationReport {
  valid: boolean;
  timestamp: string;
  results: EnvCheckResult[];
  missingRequired: string[];
  missingOptional: string[];
}

// ─── Registry ────────────────────────────────────────────────────────────────

interface EnvSpec {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

const ENV_SPECS: EnvSpec[] = [
  // Required
  {
    key: "DATABASE_URL",
    label: "Database Connection",
    required: true,
    description: "PostgreSQL connection string for Prisma",
  },
  {
    key: "APP_URL",
    label: "Application URL",
    required: true,
    description: "Base URL for the application (used in SEO, emails, redirects)",
  },

  // Optional but recommended
  {
    key: "ADMIN_SECRET",
    label: "Admin Secret",
    required: false,
    description: "Secret for admin API authentication. Without it, admin routes are open.",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    label: "Public App URL",
    required: false,
    description: "Public-facing app URL (client-side). Falls back to APP_URL.",
  },
  {
    key: "NEXT_PUBLIC_GA_ID",
    label: "Google Analytics ID",
    required: false,
    description: "Google Analytics measurement ID for tracking.",
  },
  {
    key: "CRON_SECRET",
    label: "Cron Secret",
    required: false,
    description: "Secret for Vercel Cron job authentication.",
  },
  {
    key: "TELEGRAM_BOT_TOKEN",
    label: "Telegram Bot Token",
    required: false,
    description: "Bot token for Telegram distribution channel.",
  },
  {
    key: "MERCADOLIVRE_APP_ID",
    label: "Mercado Livre App ID",
    required: false,
    description: "OAuth app ID for Mercado Livre integration.",
  },
  {
    key: "MERCADOLIVRE_SECRET",
    label: "Mercado Livre Secret",
    required: false,
    description: "OAuth secret for Mercado Livre integration.",
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API Key",
    required: false,
    description: "API key for Resend email delivery service.",
  },
];

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates all required environment variables and warns about optional ones.
 * Returns a structured report.
 */
export function validateRequiredEnvs(): EnvValidationReport {
  const results: EnvCheckResult[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const spec of ENV_SPECS) {
    const value = process.env[spec.key];
    const hasValue = !!value && value.trim().length > 0;

    if (hasValue) {
      results.push({
        key: spec.key,
        label: spec.label,
        required: spec.required,
        status: "ok",
        message: `${spec.key} configurado`,
      });
    } else if (spec.required) {
      missingRequired.push(spec.key);
      results.push({
        key: spec.key,
        label: spec.label,
        required: true,
        status: "missing",
        message: `${spec.key} NAO CONFIGURADO — ${spec.description}`,
      });
    } else {
      missingOptional.push(spec.key);
      results.push({
        key: spec.key,
        label: spec.label,
        required: false,
        status: "warning",
        message: `${spec.key} nao configurado (opcional) — ${spec.description}`,
      });
    }
  }

  // Log warnings at startup
  if (missingRequired.length > 0) {
    console.error(
      `[env] ERRO: Variaveis obrigatorias faltando: ${missingRequired.join(", ")}`
    );
  }
  if (missingOptional.length > 0) {
    console.warn(
      `[env] Aviso: Variaveis opcionais faltando: ${missingOptional.join(", ")}`
    );
  }

  return {
    valid: missingRequired.length === 0,
    timestamp: new Date().toISOString(),
    results,
    missingRequired,
    missingOptional,
  };
}

/**
 * Quick check: are all required envs present?
 */
export function areRequiredEnvsValid(): boolean {
  return ENV_SPECS.filter((s) => s.required).every(
    (s) => !!process.env[s.key] && process.env[s.key]!.trim().length > 0
  );
}
