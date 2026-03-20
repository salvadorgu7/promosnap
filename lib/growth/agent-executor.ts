/**
 * Agent Executor — runs growth agents and persists actions to DB.
 *
 * Flow:
 *   1. Agent generates suggested actions (detect phase)
 *   2. Actions are persisted to GrowthAction table
 *   3. Actions meeting auto-approval criteria are executed immediately
 *   4. Other actions wait for manual approval in admin
 *   5. Results are tracked and agent scorecards updated
 *
 * Auto-approval criteria:
 *   - confidenceScore >= 75
 *   - All guardrails pass
 *   - Agent frequency allows it (not exceeding daily/weekly limits)
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { GROWTH_AGENTS, type GrowthAction } from './command-center'

const log = logger.child({ module: 'agent-executor' })

// ── Types ──────────────────────────────────────────────────────────────────

export interface AgentExecutor {
  agentName: string
  /** Detect phase: scan for opportunities, return suggested actions */
  detect(): Promise<GrowthAction[]>
  /** Execute a single approved action */
  execute(action: GrowthAction): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }>
}

interface ExecutionSummary {
  agentName: string
  detected: number
  autoApproved: number
  executed: number
  succeeded: number
  failed: number
  skipped: number
}

// ── Auto-Approval ──────────────────────────────────────────────────────────

const AUTO_APPROVE_THRESHOLD = 75 // minimum confidenceScore
const MAX_AUTO_ACTIONS_PER_AGENT = 10 // per run

function shouldAutoApprove(action: GrowthAction): boolean {
  return (
    action.confidenceScore >= AUTO_APPROVE_THRESHOLD &&
    action.priorityScore >= 40 &&
    action.status === 'suggested'
  )
}

// ── Guardrail Checking ─────────────────────────────────────────────────────

const GUARDRAIL_CHECKS: Record<string, (meta: Record<string, unknown>) => boolean> = {
  has_affiliate: (m) => !!m.affiliateUrl && m.affiliateUrl !== '#',
  has_image: (m) => !!m.imageUrl,
  min_offer_score_40: (m) => typeof m.offerScore === 'number' && m.offerScore >= 40,
  min_discount_10: (m) => typeof m.discount === 'number' && m.discount >= 10,
  min_products_for_campaign_5: (m) => typeof m.productCount === 'number' && m.productCount >= 5,
  no_campaign_without_landing: (m) => !!m.hasLanding,
  min_readiness_60: (m) => typeof m.readiness === 'number' && m.readiness >= 60,
  min_score_40: (m) => typeof m.score === 'number' && m.score >= 40,
  min_decision_value_50: (m) => typeof m.decisionValue === 'number' && m.decisionValue >= 50,
  only_real_drops: (m) => typeof m.dropPercent === 'number' && m.dropPercent >= 5,
  min_5pct_drop: (m) => typeof m.dropPercent === 'number' && m.dropPercent >= 5,
}

function checkGuardrails(agentName: string, metadata: Record<string, unknown>): {
  passed: string[]
  failed: string[]
} {
  const agent = GROWTH_AGENTS.find(a => a.name === agentName)
  if (!agent) return { passed: [], failed: [] }

  const passed: string[] = []
  const failed: string[] = []

  for (const rail of agent.guardrails) {
    const check = GUARDRAIL_CHECKS[rail]
    if (!check) {
      passed.push(rail) // Unknown guardrail = pass (no check available)
      continue
    }
    if (check(metadata)) {
      passed.push(rail)
    } else {
      failed.push(rail)
    }
  }

  return { passed, failed }
}

// ── Persist Actions ────────────────────────────────────────────────────────

async function persistAction(action: GrowthAction, autoApproved: boolean, guardrails: { passed: string[]; failed: string[] }): Promise<string> {
  const record = await prisma.growthAction.create({
    data: {
      agentName: action.agentName,
      actionType: action.actionType,
      description: action.description,
      priorityScore: action.priorityScore,
      impactScore: action.impactScore,
      confidenceScore: action.confidenceScore,
      status: autoApproved && guardrails.failed.length === 0 ? 'APPROVED' : 'SUGGESTED',
      autoApproved: autoApproved && guardrails.failed.length === 0,
      guardrailsPassed: guardrails.passed,
      guardrailsFailed: guardrails.failed,
      metadata: action.metadata as any,
    },
  })
  return record.id
}

async function markExecuting(actionId: string): Promise<void> {
  await prisma.growthAction.update({
    where: { id: actionId },
    data: { status: 'EXECUTING', executedAt: new Date() },
  })
}

async function markDone(actionId: string, result: Record<string, unknown>): Promise<void> {
  await prisma.growthAction.update({
    where: { id: actionId },
    data: { status: 'DONE', completedAt: new Date(), result: result as any },
  })
}

async function markFailed(actionId: string, error: string): Promise<void> {
  await prisma.growthAction.update({
    where: { id: actionId },
    data: { status: 'FAILED', completedAt: new Date(), errorLog: error },
  })
}

// ── Run Agent ──────────────────────────────────────────────────────────────

/**
 * Run a single agent: detect → persist → auto-approve → execute.
 */
export async function runAgent(executor: AgentExecutor): Promise<ExecutionSummary> {
  const summary: ExecutionSummary = {
    agentName: executor.agentName,
    detected: 0,
    autoApproved: 0,
    executed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  }

  try {
    // 1. Detect phase
    const actions = await executor.detect()
    summary.detected = actions.length

    if (actions.length === 0) {
      log.debug('agent.no-actions', { agent: executor.agentName })
      return summary
    }

    // 2. Persist + check guardrails + auto-approve
    const toExecute: Array<{ id: string; action: GrowthAction }> = []

    for (const action of actions.slice(0, MAX_AUTO_ACTIONS_PER_AGENT * 2)) {
      const guardrails = checkGuardrails(executor.agentName, action.metadata)
      const canAutoApprove = shouldAutoApprove(action) && guardrails.failed.length === 0

      const actionId = await persistAction(action, canAutoApprove, guardrails)

      if (canAutoApprove) {
        summary.autoApproved++
        toExecute.push({ id: actionId, action })
      } else if (guardrails.failed.length > 0) {
        summary.skipped++
        log.info('agent.guardrail-blocked', {
          agent: executor.agentName,
          action: action.actionType,
          failed: guardrails.failed,
        })
      }
    }

    // 3. Execute auto-approved actions (up to limit)
    for (const { id, action } of toExecute.slice(0, MAX_AUTO_ACTIONS_PER_AGENT)) {
      try {
        await markExecuting(id)
        summary.executed++

        const result = await executor.execute(action)

        if (result.success) {
          await markDone(id, result.result || {})
          summary.succeeded++
        } else {
          await markFailed(id, result.error || 'Unknown error')
          summary.failed++
        }
      } catch (err) {
        await markFailed(id, err instanceof Error ? err.message : String(err))
        summary.failed++
      }
    }

    log.info('agent.run.complete', { ...summary })
  } catch (err) {
    log.error('agent.run.error', { agent: executor.agentName, error: err })
  }

  return summary
}

// ── Run All Agents ─────────────────────────────────────────────────────────

/**
 * Run all registered agents sequentially.
 * Called by growth-daily cron job.
 */
export async function runAllAgents(executors: AgentExecutor[]): Promise<ExecutionSummary[]> {
  const summaries: ExecutionSummary[] = []

  for (const executor of executors) {
    const summary = await runAgent(executor)
    summaries.push(summary)
  }

  const totalExecuted = summaries.reduce((s, a) => s + a.executed, 0)
  const totalSucceeded = summaries.reduce((s, a) => s + a.succeeded, 0)

  log.info('agents.all.complete', {
    agents: summaries.length,
    totalDetected: summaries.reduce((s, a) => s + a.detected, 0),
    totalAutoApproved: summaries.reduce((s, a) => s + a.autoApproved, 0),
    totalExecuted,
    totalSucceeded,
    totalFailed: summaries.reduce((s, a) => s + a.failed, 0),
  })

  return summaries
}

// ── Manual Approval ────────────────────────────────────────────────────────

/**
 * Approve a suggested action (from admin UI).
 */
export async function approveAction(actionId: string): Promise<void> {
  await prisma.growthAction.update({
    where: { id: actionId },
    data: { status: 'APPROVED' },
  })
}

/**
 * Skip a suggested action (from admin UI).
 */
export async function skipAction(actionId: string): Promise<void> {
  await prisma.growthAction.update({
    where: { id: actionId },
    data: { status: 'SKIPPED' },
  })
}

/**
 * Get pending actions for admin review.
 */
export async function getPendingActions(limit = 20): Promise<any[]> {
  return prisma.growthAction.findMany({
    where: { status: 'SUGGESTED' },
    orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
}

/**
 * Get recent action history.
 */
export async function getActionHistory(days = 7, limit = 50): Promise<any[]> {
  const since = new Date(Date.now() - days * 86_400_000)
  return prisma.growthAction.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
