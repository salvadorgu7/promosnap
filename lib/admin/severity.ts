/**
 * Standardized severity visualization helpers for all admin pages.
 *
 * Canonical color mapping:
 *   OK / PASS / HEALTHY / GOOD  → emerald-500 (green)
 *   INFO / MOCK                 → blue-500
 *   WARNING / WARN / DEGRADED   → amber-500
 *   CRITICAL / FAIL / ERROR     → red-500
 */

// ── Severity levels ──

export type Severity = "ok" | "info" | "warning" | "critical";

/**
 * Normalize any status string from the codebase into a canonical Severity.
 * Handles: pass/healthy/good/active/ready/excellent → ok
 *          info/mock/partial                        → info
 *          warn/warning/degraded/paused/fair        → warning
 *          fail/error/critical/blocked/poor          → critical
 */
export function toSeverity(status: string): Severity {
  const s = status.toLowerCase().trim();
  if (
    ["pass", "healthy", "good", "active", "ready", "excellent", "ok", "configured"].includes(s)
  ) {
    return "ok";
  }
  if (["info", "mock"].includes(s)) {
    return "info";
  }
  if (["warn", "warning", "degraded", "paused", "partial", "fair"].includes(s)) {
    return "warning";
  }
  return "critical";
}

// ── Badge styles ──

const BADGE_STYLES: Record<Severity, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const BADGE_SOLID: Record<Severity, string> = {
  ok: "bg-emerald-500 text-white",
  info: "bg-blue-500 text-white",
  warning: "bg-amber-500 text-white",
  critical: "bg-red-500 text-white",
};

const DOT_COLORS: Record<Severity, string> = {
  ok: "bg-emerald-500",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

const TEXT_COLORS: Record<Severity, string> = {
  ok: "text-emerald-600",
  info: "text-blue-600",
  warning: "text-amber-600",
  critical: "text-red-600",
};

const BG_COLORS: Record<Severity, string> = {
  ok: "bg-emerald-50",
  info: "bg-blue-50",
  warning: "bg-amber-50",
  critical: "bg-red-50",
};

const ICON_BG: Record<Severity, string> = {
  ok: "bg-emerald-50 text-emerald-600",
  info: "bg-blue-50 text-blue-600",
  warning: "bg-amber-50 text-amber-600",
  critical: "bg-red-50 text-red-600",
};

const GRADIENT: Record<Severity, string> = {
  ok: "from-emerald-500 to-emerald-600",
  info: "from-blue-500 to-blue-600",
  warning: "from-amber-500 to-amber-600",
  critical: "from-red-500 to-red-600",
};

const CARD_BORDER: Record<Severity, string> = {
  ok: "border-emerald-200",
  info: "border-blue-200",
  warning: "border-amber-200",
  critical: "border-red-200",
};

// ── Public accessors ──

/** Outlined badge: light bg, colored text, colored border */
export function severityBadge(severity: Severity): string {
  return BADGE_STYLES[severity];
}

/** Solid badge: filled bg, white text */
export function severitySolid(severity: Severity): string {
  return BADGE_SOLID[severity];
}

/** Small dot color */
export function severityDot(severity: Severity): string {
  return DOT_COLORS[severity];
}

/** Text color for inline status text */
export function severityText(severity: Severity): string {
  return TEXT_COLORS[severity];
}

/** Light background for row/card highlights */
export function severityBg(severity: Severity): string {
  return BG_COLORS[severity];
}

/** Icon container: bg + text color */
export function severityIconBg(severity: Severity): string {
  return ICON_BG[severity];
}

/** Gradient for banners: use with bg-gradient-to-r */
export function severityGradient(severity: Severity): string {
  return GRADIENT[severity];
}

/** Border color for cards */
export function severityBorder(severity: Severity): string {
  return CARD_BORDER[severity];
}

/**
 * Full card style: bg + text + border
 * Use for cards whose entire background reflects status.
 */
export function severityCard(severity: Severity): string {
  return `${TEXT_COLORS[severity]} ${BG_COLORS[severity]} ${CARD_BORDER[severity]}`;
}
