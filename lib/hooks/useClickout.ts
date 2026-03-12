/**
 * Build the clickout tracking URL for an offer.
 * Use this in anchor tags: <a href={buildClickoutUrl(offerId)} target="_blank" rel="noopener sponsored">
 */
export function buildClickoutUrl(
  offerId: string,
  query?: string
): string {
  const base = `/api/clickout/${encodeURIComponent(offerId)}`;
  if (query) {
    return `${base}?q=${encodeURIComponent(query)}`;
  }
  return base;
}
