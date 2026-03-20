/**
 * Admin API — Growth Actions
 *
 * GET  /api/admin/growth/actions         — List pending + recent actions
 * POST /api/admin/growth/actions         — Approve or skip an action
 * POST /api/admin/growth/actions?run=all — Run all agents now (on-demand)
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { getPendingActions, getActionHistory, approveAction, skipAction, runAllAgents } from '@/lib/growth/agent-executor'
import { ALL_AGENTS } from '@/lib/growth/agents'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  const pending = await getPendingActions(30)
  const history = await getActionHistory(7, 50)

  return NextResponse.json({ pending, history })
}

export async function POST(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  // Run all agents on demand
  const runParam = req.nextUrl.searchParams.get('run')
  if (runParam === 'all') {
    logger.info('[GROWTH] Manual agent run triggered')
    const summaries = await runAllAgents(ALL_AGENTS)
    return NextResponse.json({ ok: true, summaries })
  }

  // Approve or skip a specific action
  const body = await req.json()
  const { actionId, decision } = body

  if (!actionId || !['approve', 'skip'].includes(decision)) {
    return NextResponse.json({ error: 'actionId and decision (approve|skip) required' }, { status: 400 })
  }

  if (decision === 'approve') {
    await approveAction(actionId)
  } else {
    await skipAction(actionId)
  }

  return NextResponse.json({ ok: true, actionId, decision })
}
