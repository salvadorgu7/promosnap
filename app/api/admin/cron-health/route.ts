import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin } from '@/lib/auth/admin';
import { checkCronHealth, sendCronAlert } from '@/lib/jobs/health';
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cron-health — Check health of all cron jobs
 *
 * Returns staleness detection, fail streaks, and overall health status.
 * Optionally sends alerts via ?alert=true.
 */
export async function GET(req: NextRequest) {
  const auth = validateAdmin(req);
  if (auth) return auth;

  const rl = rateLimit(req, 'admin');
  if (!rl.success) return rateLimitResponse(rl);

  const report = await checkCronHealth();

  // Optionally send alert
  const shouldAlert = req.nextUrl.searchParams.get('alert') === 'true';
  let alertSent = false;
  if (shouldAlert && !report.healthy) {
    alertSent = await sendCronAlert(report);
  }

  return NextResponse.json({
    ...report,
    ...(shouldAlert ? { alertSent } : {}),
  }, {
    status: report.healthy ? 200 : 503,
  });
}
