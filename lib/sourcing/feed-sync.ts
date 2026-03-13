// ============================================
// SOURCING — Feed Sync Architecture
// ============================================
// Architecture-only module — no real external fetches yet.
// Defines config, status tracking, and placeholder sync logic.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedFormat = 'csv' | 'json' | 'api'

export interface FeedSyncConfig {
  id: string
  sourceId: string
  sourceName: string
  format: FeedFormat
  url?: string
  schedule?: string
  lastSync?: Date
  enabled: boolean
}

export type FeedSyncStatus = 'idle' | 'running' | 'success' | 'failed' | 'not_configured'

export interface FeedSyncStatusEntry {
  configId: string
  sourceId: string
  status: FeedSyncStatus
  lastAttempt?: Date
  lastSuccess?: Date
  lastError?: string
  itemsProcessed?: number
}

// ---------------------------------------------------------------------------
// In-memory config store
// ---------------------------------------------------------------------------

const feedConfigs: FeedSyncConfig[] = buildDefaultConfigs()
const syncStatusMap = new Map<string, FeedSyncStatusEntry>()
const syncLog: Array<{ configId: string; status: string; timestamp: Date; message: string }> = []

function buildDefaultConfigs(): FeedSyncConfig[] {
  const configs: FeedSyncConfig[] = []

  // Amazon feed
  if (process.env.AMAZON_FEED_URL) {
    configs.push({
      id: 'feed_amazon',
      sourceId: 'amazon-br',
      sourceName: 'Amazon Brasil',
      format: (process.env.AMAZON_FEED_FORMAT as FeedFormat) || 'csv',
      url: process.env.AMAZON_FEED_URL,
      schedule: process.env.AMAZON_FEED_SCHEDULE || '0 */6 * * *',
      enabled: true,
    })
  }

  // ML feed
  if (process.env.ML_FEED_URL) {
    configs.push({
      id: 'feed_ml',
      sourceId: 'mercadolivre',
      sourceName: 'Mercado Livre',
      format: (process.env.ML_FEED_FORMAT as FeedFormat) || 'json',
      url: process.env.ML_FEED_URL,
      schedule: process.env.ML_FEED_SCHEDULE || '0 */4 * * *',
      enabled: true,
    })
  }

  // Shopee feed
  if (process.env.SHOPEE_FEED_URL) {
    configs.push({
      id: 'feed_shopee',
      sourceId: 'shopee',
      sourceName: 'Shopee',
      format: (process.env.SHOPEE_FEED_FORMAT as FeedFormat) || 'api',
      url: process.env.SHOPEE_FEED_URL,
      schedule: process.env.SHOPEE_FEED_SCHEDULE || '0 */8 * * *',
      enabled: true,
    })
  }

  // Shein feed
  if (process.env.SHEIN_FEED_URL) {
    configs.push({
      id: 'feed_shein',
      sourceId: 'shein',
      sourceName: 'Shein',
      format: (process.env.SHEIN_FEED_FORMAT as FeedFormat) || 'csv',
      url: process.env.SHEIN_FEED_URL,
      schedule: process.env.SHEIN_FEED_SCHEDULE || '0 */12 * * *',
      enabled: true,
    })
  }

  return configs
}

// ---------------------------------------------------------------------------
// Get feed sync configs
// ---------------------------------------------------------------------------

export function getFeedSyncConfigs(): FeedSyncConfig[] {
  return [...feedConfigs]
}

// ---------------------------------------------------------------------------
// Run feed sync (placeholder)
// ---------------------------------------------------------------------------

export async function runFeedSync(
  configId: string
): Promise<{ success: boolean; message: string }> {
  const config = feedConfigs.find((c) => c.id === configId)

  if (!config) {
    return { success: false, message: `Config "${configId}" nao encontrada` }
  }

  if (!config.enabled) {
    return { success: false, message: `Feed sync "${configId}" esta desabilitado` }
  }

  if (!config.url) {
    const entry: FeedSyncStatusEntry = {
      configId,
      sourceId: config.sourceId,
      status: 'not_configured',
      lastAttempt: new Date(),
      lastError: 'URL do feed nao configurada',
    }
    syncStatusMap.set(configId, entry)
    addSyncLog(configId, 'not_configured', 'URL do feed nao configurada')
    return { success: false, message: 'URL do feed nao configurada' }
  }

  // Mark as running
  const entry: FeedSyncStatusEntry = {
    configId,
    sourceId: config.sourceId,
    status: 'running',
    lastAttempt: new Date(),
  }
  syncStatusMap.set(configId, entry)
  addSyncLog(configId, 'running', `Iniciando sync para ${config.sourceName} (${config.format})`)

  // Placeholder: validate config and simulate sync
  // In future, this will actually fetch and parse the feed
  try {
    // Validate URL format
    new URL(config.url)

    // Simulate processing delay
    console.log(
      `[FeedSync] ${config.sourceName}: sync placeholder — format=${config.format}, url=${config.url}`
    )

    // Mark success (placeholder)
    const successEntry: FeedSyncStatusEntry = {
      configId,
      sourceId: config.sourceId,
      status: 'success',
      lastAttempt: new Date(),
      lastSuccess: new Date(),
      itemsProcessed: 0,
    }
    syncStatusMap.set(configId, successEntry)
    config.lastSync = new Date()
    addSyncLog(configId, 'success', `Sync placeholder concluido — integracao real pendente`)

    return {
      success: true,
      message: `Feed sync para ${config.sourceName} validado — integracao real de fetch pendente`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    const failEntry: FeedSyncStatusEntry = {
      configId,
      sourceId: config.sourceId,
      status: 'failed',
      lastAttempt: new Date(),
      lastError: msg,
    }
    syncStatusMap.set(configId, failEntry)
    addSyncLog(configId, 'failed', msg)

    return { success: false, message: msg }
  }
}

// ---------------------------------------------------------------------------
// Get feed sync status
// ---------------------------------------------------------------------------

export function getFeedSyncStatus(): FeedSyncStatusEntry[] {
  // Build status for all configs, using stored status or defaults
  return feedConfigs.map((config) => {
    const stored = syncStatusMap.get(config.id)
    if (stored) return stored

    return {
      configId: config.id,
      sourceId: config.sourceId,
      status: 'idle' as FeedSyncStatus,
    }
  })
}

// ---------------------------------------------------------------------------
// Sync log
// ---------------------------------------------------------------------------

function addSyncLog(configId: string, status: string, message: string): void {
  syncLog.unshift({ configId, status, timestamp: new Date(), message })
  if (syncLog.length > 100) {
    syncLog.length = 100
  }
}

export function getFeedSyncLog(
  limit = 50
): Array<{ configId: string; status: string; timestamp: Date; message: string }> {
  return syncLog.slice(0, limit)
}
