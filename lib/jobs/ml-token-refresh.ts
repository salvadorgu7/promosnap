/**
 * ml-token-refresh — Proactively refreshes the ML OAuth user token.
 *
 * ML tokens expire in ~6h. This job runs daily and refreshes the token
 * if it exists and will expire within the next 2 hours, preventing
 * silent failures in cron jobs that depend on ML API access.
 */

import { mlTokenStore } from '@/lib/ml-auth'
import { logger } from '@/lib/logger'

const REFRESH_MARGIN_MS = 2 * 60 * 60 * 1000 // 2 hours

export async function refreshMLToken() {
  const token = await mlTokenStore.get()

  if (!token) {
    return {
      status: 'SKIPPED',
      reason: 'Nenhum token OAuth de usuario encontrado — use /api/admin/ml/auth para conectar',
    }
  }

  const ageMs = Date.now() - token.obtained_at
  const expiresMs = token.expires_in * 1000
  const remainingMs = expiresMs - ageMs

  // Still fresh enough — no refresh needed
  if (remainingMs > REFRESH_MARGIN_MS) {
    const remainingH = Math.round(remainingMs / 3_600_000 * 10) / 10
    logger.info('ml-token-refresh.still-valid', { remainingH })
    return {
      status: 'OK',
      reason: `Token valido — expira em ${remainingH}h`,
      metadata: { remainingH },
    }
  }

  // Token is close to expiry — refresh it
  if (!token.refresh_token) {
    logger.warn('ml-token-refresh.no-refresh-token')
    return {
      status: 'WARN',
      reason: 'Token quase expirando mas sem refresh_token — re-autorize via /api/admin/ml/auth',
    }
  }

  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return {
      status: 'WARN',
      reason: 'Credenciais ML ausentes — nao e possivel renovar token',
    }
  }

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refresh_token,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error('ml-token-refresh.failed', { status: res.status, err: err.slice(0, 300) })
      return {
        status: 'FAILED',
        reason: `Refresh falhou: ${res.status}`,
      }
    }

    const fresh = await res.json()
    fresh.obtained_at = Date.now()
    await mlTokenStore.set(fresh)

    const newExpiresH = Math.round((fresh.expires_in || 21600) / 3600 * 10) / 10
    logger.info('ml-token-refresh.ok', { expiresIn: fresh.expires_in, newExpiresH })

    return {
      status: 'OK',
      reason: `Token renovado — valido por ${newExpiresH}h`,
      metadata: { expiresInH: newExpiresH, userId: fresh.user_id },
    }
  } catch (err) {
    logger.error('ml-token-refresh.exception', { error: err })
    return {
      status: 'FAILED',
      reason: `Erro ao renovar: ${err instanceof Error ? err.message : err}`,
    }
  }
}
