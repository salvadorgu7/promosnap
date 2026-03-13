import crypto from 'crypto'

// PKCE store — global singleton for serverless
const globalForPKCE = globalThis as unknown as { __pkceStore?: Map<string, string> }
export const pkceStore = globalForPKCE.__pkceStore ?? new Map<string, string>()
globalForPKCE.__pkceStore = pkceStore

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
