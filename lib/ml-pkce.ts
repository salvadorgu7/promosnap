import crypto from 'crypto'
import prisma from '@/lib/db/prisma'

const PKCE_KEY_PREFIX = 'pkce_verifier_'

// Database-persisted PKCE store (survives Vercel cold starts / multi-instance)
export const pkceStore = {
  async set(state: string, verifier: string) {
    try {
      await prisma.systemSetting.upsert({
        where: { key: `${PKCE_KEY_PREFIX}${state}` },
        create: { key: `${PKCE_KEY_PREFIX}${state}`, value: verifier },
        update: { value: verifier },
      })
    } catch (err) {
      console.error('[ml-pkce] Failed to save verifier to DB:', err)
    }
  },

  async get(state: string): Promise<string | undefined> {
    try {
      const row = await prisma.systemSetting.findUnique({
        where: { key: `${PKCE_KEY_PREFIX}${state}` },
      })
      return row?.value ?? undefined
    } catch (err) {
      console.error('[ml-pkce] Failed to read verifier from DB:', err)
      return undefined
    }
  },

  async delete(state: string) {
    try {
      await prisma.systemSetting.deleteMany({
        where: { key: `${PKCE_KEY_PREFIX}${state}` },
      })
    } catch {
      // ignore
    }
  },

  /** Clean up old PKCE entries (older than 10 minutes) */
  async cleanup() {
    try {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)
      await prisma.systemSetting.deleteMany({
        where: {
          key: { startsWith: PKCE_KEY_PREFIX },
          updatedAt: { lt: tenMinAgo },
        },
      })
    } catch {
      // ignore
    }
  },
}

export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
  return { verifier, challenge }
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex')
}
