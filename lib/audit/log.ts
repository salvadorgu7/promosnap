// Structured audit logging for admin actions.
// Currently outputs via structured logger; ready for persistence layer later.

import { logger } from "@/lib/logger"

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
  logger.info("audit.action", entry)
}
