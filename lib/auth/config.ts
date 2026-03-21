/**
 * NextAuth Configuration — Google + Email Magic Link
 *
 * Uses Prisma adapter for session/account storage.
 * Magic link via Resend email provider.
 *
 * SETUP:
 *   1. npm i next-auth @auth/prisma-adapter
 *   2. Set env vars: NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   3. prisma db push (to create User/Account/Session tables)
 *   4. Create app/api/auth/[...nextauth]/route.ts
 *
 * Env vars:
 *   NEXTAUTH_SECRET       — random secret for JWT signing
 *   NEXTAUTH_URL          — app URL (auto-detected on Vercel)
 *   GOOGLE_CLIENT_ID      — Google OAuth client ID
 *   GOOGLE_CLIENT_SECRET   — Google OAuth client secret
 *   RESEND_API_KEY        — for magic link emails (already configured)
 */

/**
 * Get NextAuth config object.
 * Call this from app/api/auth/[...nextauth]/route.ts after installing next-auth.
 *
 * Usage:
 *   import { getAuthOptions } from '@/lib/auth/config'
 *   import NextAuth from 'next-auth'
 *   const handler = NextAuth(getAuthOptions())
 *   export { handler as GET, handler as POST }
 */
export function getAuthOptions(): Record<string, unknown> {
  return {
    providers: getProviders(),
    callbacks: {
      async session({ session, token }: { session: any; token: any }) {
        if (session.user && token.sub) {
          session.user.id = token.sub
        }
        return session
      },
      async jwt({ token, user }: { token: any; user: any }) {
        if (user) {
          token.sub = user.id
        }
        return token
      },
    },
    session: {
      strategy: 'jwt' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
      signIn: '/login',
      error: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET || process.env.ADMIN_SECRET,
  }
}

function getProviders(): unknown[] {
  const providers: unknown[] = []

  // Google OAuth (requires: npm i next-auth)
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const GoogleProvider = require('next-auth/providers/google').default
      providers.push(
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
      )
    } catch {
      // next-auth not installed yet — skip
    }
  }

  // Email Magic Link via Resend (requires: npm i next-auth)
  if (process.env.RESEND_API_KEY) {
    try {
      const EmailProvider = require('next-auth/providers/email').default
      providers.push(
        EmailProvider({
          server: {
            host: 'smtp.resend.com',
            port: 465,
            auth: {
              user: 'resend',
              pass: process.env.RESEND_API_KEY,
            },
          },
          from: process.env.EMAIL_FROM || 'PromoSnap <noreply@promosnap.com.br>',
        })
      )
    } catch {
      // next-auth not installed yet — skip
    }
  }

  return providers
}

/** Check if auth system is configured */
export function isAuthConfigured(): boolean {
  try {
    require('next-auth')
    return !!(process.env.NEXTAUTH_SECRET || process.env.ADMIN_SECRET)
  } catch {
    return false
  }
}
