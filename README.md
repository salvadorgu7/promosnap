# PromoSnap

**Ofertas reais, preço de verdade.**

Agregador inteligente de ofertas que monitora Amazon, Mercado Livre, Shopee e Shein. Compara preços, mostra histórico real e calcula score de oferta.

## Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS (dark sportsbook theme)
- Prisma + PostgreSQL
- Redis (optional)

## Quick Start

```bash
git clone https://github.com/YOUR_USER/promosnap.git
cd promosnap
npm install
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Deploy

Recommended: Vercel + Neon/Supabase + Upstash

## Scripts

- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run db:seed` — Seed database
- `npm run db:studio` — Prisma Studio
