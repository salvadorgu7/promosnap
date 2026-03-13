// ============================================
// Sync Architecture — per-source sync pipeline config & recommendations
// ============================================
// V22: Defines sync pipelines, readiness checks, and batch preparation.

import { adapterRegistry } from './registry'
import type { SourceCapabilityTruth, CapabilityTruthStatus } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncStepName = 'validate' | 'normalize' | 'enrich' | 'match' | 'publish'

export interface SyncStep {
  name: SyncStepName
  label: string
  status: 'ready' | 'blocked' | 'partial'
  description: string
}

export type SyncPipelineStatus = 'ready' | 'blocked' | 'partial'

export interface SyncPipeline {
  sourceId: string
  name: string
  steps: SyncStep[]
  status: SyncPipelineStatus
  blockers: string[]
  lastRun?: Date
  nextRun?: Date
  capabilityTruth: SourceCapabilityTruth
}

export interface SyncRecommendation {
  type: 'sync' | 'reprocess' | 'stale' | 'gap'
  title: string
  reason: string
  priority: number
  sourceId?: string
  actionUrl?: string
}

// ---------------------------------------------------------------------------
// Default step definitions
// ---------------------------------------------------------------------------

function buildSteps(truthStatus: CapabilityTruthStatus): SyncStep[] {
  const isReady = truthStatus === 'sync-ready' || truthStatus === 'feed-ready'
  const isPartial = truthStatus === 'partial'

  return [
    {
      name: 'validate',
      label: 'Validar',
      status: 'ready',
      description: 'Valida formato e campos obrigatorios dos itens',
    },
    {
      name: 'normalize',
      label: 'Normalizar',
      status: 'ready',
      description: 'Normaliza precos, moedas e campos de texto',
    },
    {
      name: 'enrich',
      label: 'Enriquecer',
      status: isReady || isPartial ? 'ready' : 'partial',
      description: 'Adiciona trust score, categoria inferida e deteccao de marca',
    },
    {
      name: 'match',
      label: 'Casar',
      status: isReady ? 'ready' : 'partial',
      description: 'Busca match com produtos existentes no catalogo',
    },
    {
      name: 'publish',
      label: 'Publicar',
      status: isReady ? 'ready' : 'blocked',
      description: 'Publica ofertas validadas no catalogo ativo',
    },
  ]
}

// ---------------------------------------------------------------------------
// Get sync pipelines for all sources
// ---------------------------------------------------------------------------

export function getSyncPipelines(): SyncPipeline[] {
  const adapters = adapterRegistry.getAll()

  return adapters.map((adapter) => {
    const truth = adapter.getCapabilityTruth?.() ?? {
      status: 'mock' as CapabilityTruthStatus,
      capabilities: [],
      missing: ['getCapabilityTruth nao implementado'],
    }

    const steps = buildSteps(truth.status)
    const blockers: string[] = []

    // Determine pipeline-level blockers
    if (truth.status === 'blocked') {
      blockers.push('Adapter bloqueado — credenciais ausentes')
    }
    if (truth.status === 'provider-needed') {
      blockers.push('Provider API key necessaria — configure credenciais')
    }
    if (truth.missing.length > 0) {
      blockers.push(`${truth.missing.length} requisito(s) pendente(s)`)
    }

    // Determine overall pipeline status
    const hasBlocked = steps.some((s) => s.status === 'blocked')
    const hasPartial = steps.some((s) => s.status === 'partial')
    let status: SyncPipelineStatus = 'ready'
    if (hasBlocked || truth.status === 'blocked' || truth.status === 'provider-needed') {
      status = 'blocked'
    } else if (hasPartial || truth.status === 'partial' || truth.status === 'mock') {
      status = 'partial'
    }

    return {
      sourceId: adapter.slug,
      name: adapter.name,
      steps,
      status,
      blockers,
      lastRun: truth.lastSync,
      nextRun: undefined,
      capabilityTruth: truth,
    }
  })
}

// ---------------------------------------------------------------------------
// Get sync recommendations
// ---------------------------------------------------------------------------

export function getSyncRecommendations(): SyncRecommendation[] {
  const pipelines = getSyncPipelines()
  const recommendations: SyncRecommendation[] = []

  for (const pipeline of pipelines) {
    const truth = pipeline.capabilityTruth

    // Recommend configuring blocked/provider-needed sources
    if (truth.status === 'provider-needed') {
      recommendations.push({
        type: 'gap',
        title: `Configurar ${pipeline.name}`,
        reason: `${pipeline.name} precisa de credenciais do provider para ativar sync real. Missing: ${truth.missing.slice(0, 3).join(', ')}`,
        priority: 60,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/fontes',
      })
    }

    if (truth.status === 'blocked') {
      recommendations.push({
        type: 'gap',
        title: `Desbloquear ${pipeline.name}`,
        reason: `${pipeline.name} esta bloqueado — configure as credenciais para habilitar operacoes`,
        priority: 80,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/fontes',
      })
    }

    // Recommend sync for partial sources
    if (truth.status === 'partial') {
      recommendations.push({
        type: 'sync',
        title: `Sincronizar ${pipeline.name}`,
        reason: `${pipeline.name} tem configuracao parcial — execute sync para importar dados disponiveis`,
        priority: 50,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/sourcing',
      })
    }

    // Recommend stale check if last sync is old
    if (truth.lastSync) {
      const hoursSinceSync = (Date.now() - truth.lastSync.getTime()) / (1000 * 60 * 60)
      if (hoursSinceSync > 168) {
        recommendations.push({
          type: 'stale',
          title: `${pipeline.name} desatualizado`,
          reason: `Ultimo sync ha ${Math.floor(hoursSinceSync / 24)} dias — ofertas podem estar desatualizadas`,
          priority: 75,
          sourceId: pipeline.sourceId,
          actionUrl: '/admin/sourcing',
        })
      }
    }
  }

  // Sort by priority descending
  return recommendations.sort((a, b) => b.priority - a.priority)
}

// ---------------------------------------------------------------------------
// Prepare sync batch for a source
// ---------------------------------------------------------------------------

export function prepareSyncBatch(
  sourceId: string
): { ready: boolean; sourceId: string; pipeline: SyncPipeline | null; errors: string[] } {
  const adapter = adapterRegistry.get(sourceId)

  if (!adapter) {
    return { ready: false, sourceId, pipeline: null, errors: [`Adapter "${sourceId}" nao encontrado`] }
  }

  const pipelines = getSyncPipelines()
  const pipeline = pipelines.find((p) => p.sourceId === sourceId) ?? null

  if (!pipeline) {
    return { ready: false, sourceId, pipeline: null, errors: [`Pipeline nao encontrado para "${sourceId}"`] }
  }

  const errors: string[] = []

  // Check adapter is configured
  if (!adapter.isConfigured()) {
    errors.push('Adapter nao configurado — credenciais ausentes')
  }

  // Check health
  const health = adapter.healthCheck?.()
  if (health && !health.healthy) {
    errors.push(`Health check falhou: ${health.message}`)
  }

  // Check syncFeed availability
  if (!adapter.syncFeed) {
    errors.push('syncFeed() nao implementado neste adapter')
  }

  // Check pipeline blockers
  if (pipeline.blockers.length > 0) {
    errors.push(...pipeline.blockers)
  }

  return {
    ready: errors.length === 0,
    sourceId,
    pipeline,
    errors,
  }
}
