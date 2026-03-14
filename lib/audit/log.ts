// Structured audit logging for admin actions.
// Currently outputs to console; ready for persistence layer later.

export function auditLog(
  action: string,
  details: Record<string, unknown>,
  userId?: string,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId ?? 'system',
    ...details,
  }
  console.log(`[AUDIT] ${entry.timestamp} ${action}`, JSON.stringify(entry))
}
