// ============================================================================
// UNIFIED COMMERCE ENGINE — Conversation Memory
// Memoria de curto prazo para sessoes conversacionais.
// Funciona para site (assistente) e WhatsApp (threads).
//
// Armazena em memoria (Map) com TTL de 30 min e limite de sessoes.
// Permite enriquecer intents com contexto de interacoes anteriores.
//
// Exemplos de enriquecimento:
//   - "algo mais barato" → mantem categoria da busca anterior
//   - "agora em outra cor" → mantem produto anterior como contexto
//   - Orcamento carregado se nova query nao especifica um novo
// ============================================================================

import { logger } from "@/lib/logger"
import type { CommerceIntent, CommerceChannel, ConversationMemory, MemoryEntry } from "./types"

const log = logger.child({ module: "commerce.memory" })

// ── Armazenamento em memoria ────────────────────────────────────────────────

const sessions = new Map<string, ConversationMemory>()

/** Maximo de sessoes simultaneas (previne memory leak) */
const MAX_SESSIONS = 1000

/** Maximo de entradas por sessao */
const MAX_ENTRIES_PER_SESSION = 10

/** TTL de sessao: 30 minutos de inatividade */
const SESSION_TTL_MS = 30 * 60 * 1000

// ── Sessao ──────────────────────────────────────────────────────────────────

/**
 * Obtem uma sessao existente ou cria uma nova.
 * Se a sessao existir mas estiver expirada, cria uma nova.
 */
export function getOrCreateSession(
  sessionId: string,
  channel: CommerceChannel
): ConversationMemory {
  const existing = sessions.get(sessionId)
  const now = new Date()

  // Se existe e nao expirou, retorna
  if (existing) {
    const elapsed = now.getTime() - existing.lastActiveAt.getTime()
    if (elapsed < SESSION_TTL_MS) {
      existing.lastActiveAt = now
      return existing
    }
    // Expirou — limpar e recriar
    log.debug("memory.sessao-expirada", { sessionId, channel })
    sessions.delete(sessionId)
  }

  // Verificar limite de sessoes
  if (sessions.size >= MAX_SESSIONS) {
    evictOldestSessions()
  }

  // Criar nova sessao
  const session: ConversationMemory = {
    sessionId,
    channel,
    entries: [],
    createdAt: now,
    lastActiveAt: now,
  }
  sessions.set(sessionId, session)

  log.debug("memory.sessao-criada", { sessionId, channel })
  return session
}

// ── Registrar interacao ─────────────────────────────────────────────────────

/**
 * Registra uma interacao na sessao.
 * Adiciona ao historico e mantem o limite de entradas por sessao.
 */
export function recordInteraction(
  sessionId: string,
  entry: Omit<MemoryEntry, "timestamp">
): void {
  const session = sessions.get(sessionId)
  if (!session) {
    log.debug("memory.sessao-nao-encontrada", { sessionId })
    return
  }

  const fullEntry: MemoryEntry = {
    ...entry,
    timestamp: new Date(),
  }

  session.entries.push(fullEntry)
  session.lastActiveAt = new Date()

  // Manter limite de entradas (FIFO)
  if (session.entries.length > MAX_ENTRIES_PER_SESSION) {
    session.entries = session.entries.slice(-MAX_ENTRIES_PER_SESSION)
  }

  log.debug("memory.interacao-registrada", {
    sessionId,
    query: entry.query,
    totalEntradas: session.entries.length,
  })
}

// ── Contexto da sessao ──────────────────────────────────────────────────────

export interface SessionContext {
  /** Categorias mencionadas nas ultimas interacoes */
  recentCategories: string[]
  /** Marcas mencionadas nas ultimas interacoes */
  recentBrands: string[]
  /** Ultimo orcamento utilizado */
  recentBudget?: { min?: number; max?: number }
  /** Produtos selecionados/clicados recentemente */
  recentProducts: string[]
  /** Produtos que o user rejeitou ("nao gostei", "outro", etc.) */
  rejectedProducts: string[]
}

/**
 * Extrai contexto consolidado da sessao.
 * Agrega categorias, marcas, orcamento e produtos das ultimas interacoes.
 * Retorna null se a sessao nao existe ou esta vazia.
 */
export function getSessionContext(sessionId: string): SessionContext | null {
  const session = sessions.get(sessionId)
  if (!session || session.entries.length === 0) return null

  // Verificar se expirou
  const elapsed = Date.now() - session.lastActiveAt.getTime()
  if (elapsed >= SESSION_TTL_MS) {
    sessions.delete(sessionId)
    return null
  }

  const recentCategories = new Set<string>()
  const recentBrands = new Set<string>()
  const recentProducts = new Set<string>()
  const rejectedProducts = new Set<string>()
  let recentBudget: { min?: number; max?: number } | undefined

  // Iterar do mais recente para o mais antigo
  const entries = [...session.entries].reverse()
  for (const entry of entries) {
    // Categorias
    if (entry.categories) {
      for (const cat of entry.categories) recentCategories.add(cat)
    }

    // Marcas
    if (entry.brands) {
      for (const brand of entry.brands) recentBrands.add(brand)
    }

    // Orcamento (usar o mais recente)
    if (!recentBudget && entry.budget) {
      recentBudget = entry.budget
    }

    // Produtos selecionados
    if (entry.selectedProducts) {
      for (const slug of entry.selectedProducts) recentProducts.add(slug)
    }

    // Produtos rejeitados
    if (entry.rejectedProducts) {
      for (const slug of entry.rejectedProducts) rejectedProducts.add(slug)
    }
  }

  return {
    recentCategories: [...recentCategories],
    recentBrands: [...recentBrands],
    recentBudget,
    recentProducts: [...recentProducts],
    rejectedProducts: [...rejectedProducts],
  }
}

// ── Enriquecimento de intent ────────────────────────────────────────────────

/**
 * Enriquece um intent com contexto da sessao.
 *
 * Regras de enriquecimento:
 * 1. Se a query nao menciona categoria mas sessao tem categoria recente → herda
 * 2. Se a query nao menciona marca mas sessao tem marca recente → herda
 * 3. Se a query nao menciona orcamento mas sessao tem orcamento → herda
 * 4. Produtos rejeitados sao propagados para exclusao
 * 5. Mencionou produto especifico antes → manter contexto
 *
 * Indicadores linguisticos em pt-BR:
 *   - "mais barato", "menor preco" → manter categoria/marca da sessao
 *   - "outra cor", "outro modelo" → manter produto anterior
 *   - "sem limite", "qualquer preco" → limpar orcamento
 */
export function enrichIntentFromMemory(
  intent: CommerceIntent,
  sessionId: string
): CommerceIntent {
  const context = getSessionContext(sessionId)
  if (!context) return intent

  const enriched = { ...intent }
  const queryLower = intent.type // usado para decisoes

  // 1. Herdar categorias se nao especificadas na query atual
  if (
    (!enriched.categories || enriched.categories.length === 0) &&
    context.recentCategories.length > 0
  ) {
    enriched.categories = context.recentCategories
    log.debug("memory.enriquecido-categorias", {
      sessionId,
      categorias: context.recentCategories,
    })
  }

  // 2. Herdar marcas se nao especificadas
  if (
    (!enriched.brands || enriched.brands.length === 0) &&
    context.recentBrands.length > 0
  ) {
    enriched.brands = context.recentBrands
    log.debug("memory.enriquecido-marcas", {
      sessionId,
      marcas: context.recentBrands,
    })
  }

  // 3. Herdar orcamento se nao especificado
  if (!enriched.budget && context.recentBudget) {
    enriched.budget = context.recentBudget
    log.debug("memory.enriquecido-orcamento", {
      sessionId,
      orcamento: context.recentBudget,
    })
  }

  // 4. Herdar mencoes de produto se nao especificadas (contexto "outro modelo")
  if (
    (!enriched.productMentions || enriched.productMentions.length === 0) &&
    context.recentProducts.length > 0
  ) {
    enriched.productMentions = context.recentProducts.slice(0, 3)
    log.debug("memory.enriquecido-produtos", {
      sessionId,
      produtos: enriched.productMentions,
    })
  }

  return enriched
}

// ── Limpeza de sessoes expiradas ────────────────────────────────────────────

/**
 * Remove sessoes expiradas da memoria.
 * Retorna o numero de sessoes removidas.
 * Deve ser chamado periodicamente (ex: a cada 5 min via cron ou interval).
 */
export function cleanExpiredSessions(): number {
  const now = Date.now()
  let removed = 0

  for (const [id, session] of sessions) {
    const elapsed = now - session.lastActiveAt.getTime()
    if (elapsed >= SESSION_TTL_MS) {
      sessions.delete(id)
      removed++
    }
  }

  if (removed > 0) {
    log.info("memory.limpeza-concluida", {
      removidas: removed,
      ativas: sessions.size,
    })
  }

  return removed
}

// ── Evictar sessoes mais antigas quando no limite ───────────────────────────

function evictOldestSessions(): void {
  // Remover 20% das sessoes mais antigas
  const toRemove = Math.ceil(MAX_SESSIONS * 0.2)
  const sorted = [...sessions.entries()]
    .sort((a, b) => a[1].lastActiveAt.getTime() - b[1].lastActiveAt.getTime())

  for (let i = 0; i < toRemove && i < sorted.length; i++) {
    sessions.delete(sorted[i][0])
  }

  log.info("memory.evicao-concluida", {
    removidas: toRemove,
    ativas: sessions.size,
  })
}

// ── Utilitarios de debug (nao exportar em producao) ─────────────────────────

/** Total de sessoes ativas (para metricas/health check) */
export function getActiveSessionCount(): number {
  return sessions.size
}

/** Obter sessao bruta (para debug/admin) */
export function getSession(sessionId: string): ConversationMemory | undefined {
  return sessions.get(sessionId)
}
