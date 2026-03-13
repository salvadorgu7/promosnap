// ============================================
// Sync Recommendations Engine
// ============================================
// V22: Intelligent suggestions for what to sync, reprocess, or configure next.

import { adapterRegistry } from '@/lib/adapters/registry'
import { getSyncPipelines, type SyncPipeline } from '@/lib/adapters/sync-architecture'
import { getFeedSyncConfigs, getFeedSyncStatus } from './feed-sync'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncRecommendation {
  type: 'sync' | 'reprocess' | 'stale' | 'gap'
  title: string
  reason: string
  priority: number // 0-100
  sourceId?: string
  actionUrl?: string
}

// ---------------------------------------------------------------------------
// Main recommendation engine
// ---------------------------------------------------------------------------

export function getSyncRecommendations(): SyncRecommendation[] {
  const recommendations: SyncRecommendation[] = []

  // Gather data
  const pipelines = getSyncPipelines()
  const feedConfigs = getFeedSyncConfigs()
  const feedStatuses = getFeedSyncStatus()

  // 1. Source staleness recommendations
  addStalenessRecommendations(recommendations, pipelines)

  // 2. Gap coverage recommendations
  addGapRecommendations(recommendations, pipelines)

  // 3. Failed batch reprocessing recommendations
  addReprocessRecommendations(recommendations, feedStatuses)

  // 4. Feed config recommendations
  addFeedConfigRecommendations(recommendations, feedConfigs, pipelines)

  // 5. Provider setup recommendations
  addProviderRecommendations(recommendations, pipelines)

  // Sort by priority descending
  return recommendations.sort((a, b) => b.priority - a.priority)
}

// ---------------------------------------------------------------------------
// Staleness — which sources have the oldest data
// ---------------------------------------------------------------------------

function addStalenessRecommendations(
  recs: SyncRecommendation[],
  pipelines: SyncPipeline[]
): void {
  for (const pipeline of pipelines) {
    const truth = pipeline.capabilityTruth

    if (!truth.lastSync) {
      // Never synced
      if (truth.status !== 'blocked' && truth.status !== 'provider-needed') {
        recs.push({
          type: 'stale',
          title: `${pipeline.name}: nunca sincronizado`,
          reason: `${pipeline.name} nunca teve um sync executado. Execute o primeiro sync para popular o catalogo.`,
          priority: 70,
          sourceId: pipeline.sourceId,
          actionUrl: '/admin/sourcing',
        })
      }
      continue
    }

    const hoursSinceSync = (Date.now() - truth.lastSync.getTime()) / (1000 * 60 * 60)

    if (hoursSinceSync > 168) {
      // 7+ days stale
      recs.push({
        type: 'stale',
        title: `${pipeline.name}: dados muito antigos`,
        reason: `Ultimo sync de ${pipeline.name} foi ha ${Math.floor(hoursSinceSync / 24)} dias. Ofertas e precos podem estar desatualizados.`,
        priority: 85,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/sourcing',
      })
    } else if (hoursSinceSync > 48) {
      // 2-7 days
      recs.push({
        type: 'stale',
        title: `${pipeline.name}: sync recomendado`,
        reason: `Ultimo sync ha ${Math.floor(hoursSinceSync / 24)} dias. Recomendado re-sync para manter precos atualizados.`,
        priority: 55,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/sourcing',
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Gap coverage — high-demand categories with low source coverage
// ---------------------------------------------------------------------------

function addGapRecommendations(
  recs: SyncRecommendation[],
  pipelines: SyncPipeline[]
): void {
  // Count how many sources are actually operational
  const operationalSources = pipelines.filter(
    (p) => p.status === 'ready' || p.status === 'partial'
  )

  if (operationalSources.length < 2) {
    recs.push({
      type: 'gap',
      title: 'Diversificar fontes de dados',
      reason: `Apenas ${operationalSources.length} fonte(s) operacional(is). Configure mais adapters para melhor cobertura de catalogo e resiliencia.`,
      priority: 65,
      actionUrl: '/admin/fontes',
    })
  }

  // Recommend enabling blocked sources
  const blockedSources = pipelines.filter((p) => p.status === 'blocked')
  for (const blocked of blockedSources) {
    recs.push({
      type: 'gap',
      title: `Habilitar ${blocked.name}`,
      reason: `${blocked.name} esta bloqueado. Configure as credenciais para adicionar mais cobertura ao catalogo.`,
      priority: 45,
      sourceId: blocked.sourceId,
      actionUrl: '/admin/fontes',
    })
  }
}

// ---------------------------------------------------------------------------
// Reprocess — failed items that should be retried
// ---------------------------------------------------------------------------

function addReprocessRecommendations(
  recs: SyncRecommendation[],
  feedStatuses: Array<{ configId: string; sourceId: string; status: string; lastError?: string }>
): void {
  const failedFeeds = feedStatuses.filter((f) => f.status === 'failed')

  for (const failed of failedFeeds) {
    recs.push({
      type: 'reprocess',
      title: `Reprocessar feed: ${failed.sourceId}`,
      reason: `Feed sync falhou: ${failed.lastError || 'erro desconhecido'}. Corrija o problema e re-execute.`,
      priority: 75,
      sourceId: failed.sourceId,
      actionUrl: '/admin/sourcing',
    })
  }
}

// ---------------------------------------------------------------------------
// Feed config — missing feed URLs
// ---------------------------------------------------------------------------

function addFeedConfigRecommendations(
  recs: SyncRecommendation[],
  feedConfigs: Array<{ id: string; sourceId: string; sourceName: string; url?: string; enabled: boolean }>,
  pipelines: SyncPipeline[]
): void {
  // Sources with pipelines but no feed config
  const configuredSourceIds = new Set(feedConfigs.map((f) => f.sourceId))

  for (const pipeline of pipelines) {
    if (!configuredSourceIds.has(pipeline.sourceId) && pipeline.status !== 'blocked') {
      recs.push({
        type: 'gap',
        title: `Configurar feed para ${pipeline.name}`,
        reason: `${pipeline.name} nao tem URL de feed configurada. Defina a variavel de ambiente correspondente para habilitar sync automatico.`,
        priority: 40,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/fontes',
      })
    }
  }

  // Disabled feeds
  const disabledFeeds = feedConfigs.filter((f) => !f.enabled)
  for (const feed of disabledFeeds) {
    recs.push({
      type: 'gap',
      title: `Reativar feed: ${feed.sourceName}`,
      reason: `Feed de ${feed.sourceName} esta desabilitado. Reative para retomar sync automatico.`,
      priority: 35,
      sourceId: feed.sourceId,
      actionUrl: '/admin/sourcing',
    })
  }
}

// ---------------------------------------------------------------------------
// Provider setup — which providers need API keys
// ---------------------------------------------------------------------------

function addProviderRecommendations(
  recs: SyncRecommendation[],
  pipelines: SyncPipeline[]
): void {
  for (const pipeline of pipelines) {
    if (pipeline.capabilityTruth.status === 'provider-needed') {
      const missing = pipeline.capabilityTruth.missing.slice(0, 3)
      recs.push({
        type: 'gap',
        title: `Obter credenciais: ${pipeline.name}`,
        reason: `${pipeline.name} precisa de credenciais do provider. Faltando: ${missing.join(', ')}`,
        priority: 50,
        sourceId: pipeline.sourceId,
        actionUrl: '/admin/fontes',
      })
    }
  }
}
