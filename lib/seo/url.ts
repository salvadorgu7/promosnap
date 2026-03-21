/**
 * Central URL builder for PromoSnap.
 * All absolute URLs should be generated through these helpers
 * to ensure canonical domain consistency.
 */

/**
 * Canonical domain — MUST match NEXT_PUBLIC_APP_URL in Vercel.
 * Google treats www and non-www as different sites.
 * Pick ONE and stick with it everywhere.
 */
const CANONICAL_DOMAIN = "https://www.promosnap.com.br";

/** Returns the canonical base URL, always consistent */
export function getBaseUrl(): string {
  // CANONICAL_DOMAIN takes precedence to avoid www/non-www split
  return CANONICAL_DOMAIN;
}

/** Build an absolute URL from a path */
export function absoluteUrl(path: string = ""): string {
  const base = getBaseUrl();
  if (!path || path === "/") return base;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/** Get canonical URL for a page (always www) */
export function canonicalUrl(path: string = ""): string {
  return absoluteUrl(path);
}

/** Get share URL for social platforms */
export function shareUrl(path: string): string {
  return absoluteUrl(path);
}

/** App name constant */
export const APP_NAME = "PromoSnap";

/** App description constant */
export const APP_DESCRIPTION =
  "Compare preços, veja histórico real e encontre os melhores descontos do Brasil";

/** Default OG image path */
export const OG_IMAGE = "/og-image.png";
