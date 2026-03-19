# PromoSnap — Plataforma de Comparação de Preços 🇧🇷

## Visão Geral
Plataforma brasileira de comparação de preços com integrações a Amazon, Mercado Livre, Shopee e Shein. Combina catálogo curado, IA para descoberta de produtos, sistema de alertas de preço e dashboards de governança.

## Stack
- **Framework:** Next.js 15 (App Router, Server Components, Turbopack)
- **UI:** React 19, Tailwind CSS 3.4, Lucide React, Recharts
- **DB:** PostgreSQL (Neon) via Prisma 6.2
- **Cache:** Redis (ioredis) — TTL 5min
- **Testes:** Vitest 4.1 + Testing Library (jsdom)
- **Email:** Resend
- **Analytics:** GA4
- **Deploy:** Vercel

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev              # Dev server (Turbopack, porta 3001)
npm run build            # Prisma generate + Next.js build
npm run lint             # ESLint

# Base de Dados
npm run db:generate      # Gerar Prisma client
npm run db:push          # Sync schema (sem migration)
npm run db:migrate       # Migration dev
npm run db:seed          # Seed data
npm run db:studio        # Prisma Studio UI

# Testes
npm test                 # Vitest (uma vez)
npm run test:watch       # Vitest watch
npm run test:legacy      # Suite legacy via tsx
npm run test:smoke       # Smoke tests
npm run verify           # Legacy + smoke + build
npm run verify:ci        # TypeScript check + build (CI)

# Utilitários
npm run check:env        # Validar env vars
npm run import:real      # Importar produtos reais
npm run import:urls      # Importar via URLs
npm run jobs:ingest      # Job ML trending keywords
```

## Estrutura do Projeto

```
app/
├── (site)/              # Rotas públicas (/, /busca, /produto/[slug], etc.)
├── admin/               # Painel admin (analytics, business, health, catalog, seo)
├── api/                 # API routes (admin/, cron, public endpoints)
├── layout.tsx           # Root layout
└── middleware.ts         # Auth + security headers

components/              # Componentes React por domínio
├── home/                # Homepage (DailyOpportunities, PersonalizedRails)
├── admin/               # Admin dashboards
├── cards/               # OfferCard, ProductCard
├── catalog/             # Catálogo
├── search/              # SearchBar, resultados
├── product/             # Página de produto
└── revenue/             # Revenue tracking

lib/                     # 70+ módulos de lógica de negócio
├── ai/                  # Conectores IA
├── alerts/              # Sistema de alertas de preço
├── amazon/              # Integração Amazon PA-API 5
├── cache/               # Redis caching
├── catalog/             # Governança do catálogo
├── clickout/            # Tracking de clickouts
├── db/                  # Prisma queries
├── decision/            # Sinais de compra
├── personalization/     # Motor de personalização
├── price/               # Cálculo e tracking de preços
├── revenue/             # Revenue e monetização
├── search/              # Motor de busca
└── seo/                 # Governança SEO

adapters/                # Integrações marketplace
├── amazon/              # PA-API 5.0 / Creators API
├── mercado-livre/       # OAuth, search, trending
├── shopee/              # CSV-first import
└── shein/               # API integration

prisma/
├── schema.prisma        # 29 tabelas (Product, Listing, Offer, PriceAlert, etc.)
└── seed.ts              # Dados iniciais
```

## Rotas Principais

### Públicas (`/app/(site)`)
| Rota | Descrição |
|------|-----------|
| `/` | Homepage (ISR 60s, lazy-loads below-fold) |
| `/busca` | Resultados de pesquisa |
| `/produto/[slug]` | Página de produto |
| `/categoria/[slug]` | Categoria |
| `/comparar` | Comparação de preços |
| `/ofertas` | Deals quentes |
| `/assistente` | Assistente IA |
| `/alertas` | Alertas de preço |
| `/radar` | Radar de notificações |
| `/favoritos` | Favoritos |

### Admin (`/admin` — protegido por cookie SHA-256)
- `/admin/analytics` — Métricas
- `/admin/business` — Scorecards de negócio
- `/admin/health` — Quality gates
- `/admin/catalog-governance` — Saúde do catálogo
- `/admin/seo` — Governança SEO
- `/admin/content` — Gestão de conteúdo

## Convenções de Código

### Geral
- TypeScript strict mode em todo o projeto
- Comentários e UI em **português do Brasil**
- Mobile-first sempre (Tailwind breakpoints: sm → md → lg)
- Server Components por defeito; Client Components só quando necessário (`"use client"`)
- ISR para páginas de catálogo (revalidate: 60-300s)

### Componentes
- Um componente por ficheiro
- Props tipadas com interface (não type alias inline)
- Lazy-load abaixo do fold com `dynamic()` ou `React.lazy()`
- Lucide React para ícones (nunca heroicons ou fontawesome)

### Estilo
- Tailwind utilities — evitar CSS custom
- Design system: cores purple (brand), surface grays, accent blue/green/red
- Fontes: Plus Jakarta Sans (display), Inter (body)
- Sombras: `shadow-card`, `shadow-card-hover`, `glow`

### Base de Dados
- Prisma para todas as queries (nunca raw SQL direto)
- Neon free tier: usar `prisma db execute` + SQL files (PgBouncer não suporta `migrate`)
- Redis cache com TTL 5min para dados de catálogo

### Segurança
- Admin auth via cookie hash SHA-256 de `ADMIN_SECRET`
- API admin protegida por header `x-admin-secret`
- CSP strict, X-Frame-Options DENY, HSTS habilitado
- `X-Robots-Tag: noindex` em todas as rotas `/api/`

### Testes
- Vitest + Testing Library para componentes
- Legacy tests correm separado via `npm run test:legacy`
- Smoke tests validam fluxos principais (home, busca, produto, clickout)
- Antes de commit: `npm run verify:quick`

## Variáveis de Ambiente Críticas

```env
# Obrigatórias
DATABASE_URL=             # PostgreSQL (Neon)
NEXT_PUBLIC_APP_URL=      # Domínio público
ADMIN_SECRET=             # Auth admin
CRON_SECRET=              # Proteção cron jobs

# Marketplaces
AMAZON_AFFILIATE_TAG=
AMAZON_CREDENTIAL_ID=
AMAZON_CREDENTIAL_SECRET=
ML_CLIENT_ID=             # Mercado Livre
ML_CLIENT_SECRET=
SHOPEE_AFFILIATE_ID=
SHEIN_API_KEY=

# Opcionais
REDIS_URL=                # Cache (sem Redis funciona, sem cache)
RESEND_API_KEY=           # Emails
NEXT_PUBLIC_GA_ID=        # Analytics
SERPAPI_KEY=              # Google Shopping results
```

## Feature Flags
O projeto usa feature flags via env vars (`FF_*`):
- `FF_ORIGIN_TRACKING` — Tracking de origem
- `FF_SEARCH_INTELLIGENCE` — Inteligência de busca
- `FF_ENHANCED_SCORING` — Scoring avançado

## Jobs & Automação
- Cron via Vercel: diário às 9h UTC (`/api/cron`)
- Job manual: `POST /api/admin/jobs/run` com `{ "job": "name" }`
- Ingest job: trending keywords do Mercado Livre

---

## ✅ Tarefas Concluídas (2026-03-19)

### 1. Página de Produto Mobile
- ✅ `MobileDecisionCompact` — consolida 4 blocos de decisão em 1 no mobile com expandable
- ✅ Spacing reduzido (`space-y-4` mobile, `space-y-6` desktop)
- ✅ Desktop mantém todos os blocos (`hidden lg:block`)

### 2. Alertas de Preço — UX
- ✅ Bell button no `MobileProductActions` sticky bar
- ✅ `InlineAlertPrompt` — "Quer pagar menos?" após best price card
- ✅ `PriceAlertForm` movido para perto do CommercialCTA
- ✅ One-tap "Alerta -10%" para users com email salvo
- ✅ Custom event `ps:open-alert` liga bell → form

### 3. QA do Assistente IA
- ✅ 35 testes Vitest (buy-signal 8, candidate-resolver 10, shopping-assistant 12, serpapi 5)
- ✅ Todos mocked (sem rede), 119/119 testes passam

### 4. Google Shopping via SearchAPI
- ✅ Endpoint diagnóstico `GET /api/admin/diag/shopping` (protegido por x-admin-secret)
- ✅ Testa isReady + query "iPhone 15" + retorna latência e sample result

### 5. Página de Produto como Decision Hub
- ✅ `HeroVerdict` — veredito compacto (Comprar/Esperar) no topo da coluna direita
- ✅ Requer `FF_BUY_SIGNALS=true` (feature flag)
- ✅ Badges contextuais: menor preço histórico, % abaixo da média, % OFF

### 6. Econômetro
- ✅ Extraído para `components/home/Econometro.tsx` (client component)
- ✅ Animação count-up (70% → 100%) no client
- ✅ SSR renderiza valor final (sem hydration mismatch)

## 📋 Backlog — Próximas Tarefas

_(a definir)_
