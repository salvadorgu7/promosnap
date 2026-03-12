/**
 * Types for the PromoSnap monitoring & observability system.
 */

export interface CapturedError {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  type: string;
  route?: string;
  context?: Record<string, unknown>;
}

export interface CapturedEvent {
  id: string;
  timestamp: string;
  name: string;
  data?: Record<string, unknown>;
}

export interface ErrorStats {
  totalErrors: number;
  byType: Record<string, number>;
  byRoute: Record<string, number>;
  last24hCount: number;
  lastHourCount: number;
}

export interface MonitoringReport {
  timestamp: string;
  recentErrors: CapturedError[];
  recentEvents: CapturedEvent[];
  stats: ErrorStats;
}
