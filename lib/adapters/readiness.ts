// ============================================
// Source Readiness — per-adapter readiness assessment
// ============================================

import { adapterRegistry } from './registry'
import type { AdapterCapability } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReadinessStatus = 'ready' | 'partial' | 'mock' | 'blocked' | 'not_configured'

export interface ChecklistItem {
  label: string
  status: 'ok' | 'missing' | 'partial'
  detail: string
}

export interface SourceReadiness {
  sourceId: string
  name: string
  status: ReadinessStatus
  checklist: ChecklistItem[]
  capabilities: AdapterCapability[]
}

// ---------------------------------------------------------------------------
// Get readiness for all adapters
// ---------------------------------------------------------------------------

export function getSourceReadiness(): SourceReadiness[] {
  const adapters = adapterRegistry.getAll()

  return adapters.map((adapter) => {
    const adapterStatus = adapter.getStatus()
    const healthResult = adapter.healthCheck?.() ?? null
    const readinessResult = adapter.readinessCheck?.() ?? null
    const capabilities = adapter.capabilityMap?.() ?? []

    // Build checklist
    const checklist: ChecklistItem[] = []

    // Env vars check
    if (adapterStatus.missingEnvVars.length === 0) {
      checklist.push({
        label: 'Variaveis de ambiente',
        status: 'ok',
        detail: 'Todas as variaveis necessarias configuradas',
      })
    } else {
      checklist.push({
        label: 'Variaveis de ambiente',
        status: 'missing',
        detail: `Faltando: ${adapterStatus.missingEnvVars.join(', ')}`,
      })
    }

    // Health check
    if (healthResult) {
      checklist.push({
        label: 'Health check',
        status: healthResult.healthy ? 'ok' : 'missing',
        detail: healthResult.message,
      })
    }

    // Readiness check
    if (readinessResult) {
      if (readinessResult.ready) {
        checklist.push({
          label: 'Readiness',
          status: 'ok',
          detail: 'Adapter pronto para producao',
        })
      } else {
        const hasPartial = readinessResult.missing.some((m) => m.includes('recomendado'))
        checklist.push({
          label: 'Readiness',
          status: hasPartial ? 'partial' : 'missing',
          detail: `Requisitos pendentes: ${readinessResult.missing.join(', ')}`,
        })
      }
    }

    // API integration status — use real capability truth instead of assuming stub
    const capTruth = adapter.getCapabilityTruth?.()
    const capStatus = capTruth?.status
    if (capStatus === 'sync-ready' || capStatus === 'feed-ready') {
      checklist.push({
        label: 'Integracao API',
        status: 'ok',
        detail: `Integracao real ativa (${capStatus})`,
      })
    } else if (capStatus === 'partial') {
      checklist.push({
        label: 'Integracao API',
        status: 'partial',
        detail: 'Integracao parcial — funcionalidade limitada',
      })
    } else if (capStatus === 'mock') {
      checklist.push({
        label: 'Integracao API',
        status: 'missing',
        detail: 'Usando dados mock — integracao real nao implementada',
      })
    } else if (capStatus === 'provider-needed') {
      checklist.push({
        label: 'Integracao API',
        status: 'missing',
        detail: 'Aguardando aprovacao do provider / API key',
      })
    } else {
      checklist.push({
        label: 'Integracao API',
        status: adapterStatus.configured ? 'partial' : 'missing',
        detail: adapterStatus.configured
          ? 'Credenciais presentes — verificar status da integracao'
          : 'Sem credenciais configuradas',
      })
    }

    // Capabilities check
    if (capabilities.length > 0) {
      checklist.push({
        label: 'Capabilities',
        status: capabilities.length >= 3 ? 'ok' : 'partial',
        detail: `${capabilities.length} capabilities ativas: ${capabilities.join(', ')}`,
      })
    }

    // Determine overall status
    const status = determineStatus(adapterStatus, checklist)

    return {
      sourceId: adapter.slug,
      name: adapter.name,
      status,
      checklist,
      capabilities,
    }
  })
}

// ---------------------------------------------------------------------------
// Determine overall readiness status
// ---------------------------------------------------------------------------

function determineStatus(
  adapterStatus: { configured: boolean; health: string; enabled: boolean },
  checklist: ChecklistItem[]
): ReadinessStatus {
  if (!adapterStatus.enabled) return 'blocked'

  const allOk = checklist.every((c) => c.status === 'ok')
  const anyMissing = checklist.some((c) => c.status === 'missing')
  const anyPartial = checklist.some((c) => c.status === 'partial')

  if (allOk) return 'ready'

  if (!adapterStatus.configured) {
    if (adapterStatus.health === 'BLOCKED') return 'blocked'
    return 'not_configured'
  }

  if (anyMissing && !anyPartial) return 'mock'
  if (anyPartial || anyMissing) return 'partial'

  return 'mock'
}

// ---------------------------------------------------------------------------
// Summary helper
// ---------------------------------------------------------------------------

export function getReadinessSummary(): {
  total: number
  ready: number
  partial: number
  mock: number
  blocked: number
  notConfigured: number
} {
  const readiness = getSourceReadiness()
  return {
    total: readiness.length,
    ready: readiness.filter((r) => r.status === 'ready').length,
    partial: readiness.filter((r) => r.status === 'partial').length,
    mock: readiness.filter((r) => r.status === 'mock').length,
    blocked: readiness.filter((r) => r.status === 'blocked').length,
    notConfigured: readiness.filter((r) => r.status === 'not_configured').length,
  }
}
