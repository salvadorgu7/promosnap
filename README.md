# PromoSnap

Comparador de precos brasileiro com automacao total. Monitora marketplaces, compara ofertas, mostra historico real de preco e opera com jobs automaticos.

## Stack

- **Framework:** Next.js 15 (App Router, Server Components, Turbopack)
- **UI:** Tailwind CSS 3 + design system customizado (light sportsbook theme)
- **DB:** PostgreSQL (Neon) via Prisma ORM
- **Cache:** Redis (ioredis) com TTL 5min para buscas
- **Charts:** Recharts
- **Icons:** Lucide React
- **Fonts:** Plus Jakarta Sans (display) + Inter (body)
- **Analytics:** GA4 (via NEXT_PUBLIC_GA_ID)
- **Cron:** Vercel Cron (a cada 6h) ou cron externo

## Setup Local

```bash
git clone <repo>
cd promosnap
npm install

cp .env.example .env.local
# Edite DATABASE_URL, ML_CLIENT_ID, ML_CLIENT_SECRET, CRON_SECRET, etc.

npx prisma generate
npx prisma db push

npm run dev
# Em outro terminal: curl -X POST http://localhost:3000/api/admin/seed
```

## Setup Vercel

1. Conecte o repo no Vercel
2. Variaveis de ambiente:
   - `DATABASE_URL` — Neon PostgreSQL
   - `ADMIN_SECRET` — segredo para rotas admin
   - `CRON_SECRET` — segredo para cron endpoint
   - `ML_CLIENT_ID` / `ML_CLIENT_SECRET` — ML OAuth
   - `ML_REDIRECT_URI` — callback OAuth
   - `NEXT_PUBLIC_GA_ID` — GA4 (opcional)
3. Build command: `prisma generate && next build`
4. Cron automatico via vercel.json (a cada 6h)

## Setup Neon

1. Crie projeto em neon.tech
2. Copie connection string para DATABASE_URL
3. `npx prisma db push`
4. POST /api/admin/seed

## ML OAuth

1. Crie app em developers.mercadolivre.com.br
2. Configure ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI
3. Acesse /api/auth/ml para iniciar fluxo
4. Token salvo e renovado automaticamente

## Jobs e Automacao

Sistema de jobs robusto com runner generico, scheduler e cron:

| Job | Descricao |
|-----|-----------|
| `ingest` | Busca trends do ML e persiste keywords |
| `update-prices` | Marca offers stale, cria snapshots |
| `compute-scores` | Recalcula offerScore (0-100) |
| `cleanup` | Remove snapshots/logs antigos |
| `check-alerts` | Verifica e dispara alertas de preco |
| `sitemap` | Valida URLs do sitemap |

**Executar manualmente:** POST /api/admin/jobs/run `{ "job": "ingest" }`
**Cron automatico:** GET /api/cron (protegido com CRON_SECRET)
**Status:** GET /api/admin/jobs/status
**Historico:** GET /api/admin/jobs/history

## Alertas de Preco

- Usuarios criam alertas na pagina do produto (email + preco alvo)
- Job `check-alerts` verifica periodicamente
- API: POST/GET/DELETE /api/alerts
- Admin: /admin/alertas

## Favoritos e Historico

- Favoritos em localStorage (ate 50 items)
- Historico "vistos recentemente" (ate 20)
- Pagina /favoritos com dados reais do banco
- Heart toggle no OfferCard
- Icon de favoritos no Header

## Tendencias

- Trends do ML persistidos no banco (TrendingKeyword)
- Componente "Em alta agora" na homepage
- Pagina /trending
- Admin: /admin/tendencias com growth ops

## Admin

/admin com painel completo:
- **Dashboard:** metricas, clickouts, jobs, alertas, trends
- **Produtos:** tabela com busca, paginacao
- **Ofertas:** score, affiliate URL
- **Fontes:** status por marketplace
- **Jobs:** cards por job com "Executar agora", historico
- **Ingestao:** importar via ID/URL do ML
- **Alertas:** alertas ativos/disparados/inativos
- **Tendencias:** trends, top buscas, clickouts, oportunidades

## Paginas

| Rota | Descricao |
|------|-----------|
| `/` | Homepage: hero, trends, oferta do dia, rails, categorias, recentes |
| `/ofertas` | Grid de ofertas quentes |
| `/menor-preco` | Maior desconto historico |
| `/mais-vendidos` | Produtos mais populares |
| `/busca?q=...` | Busca com filtros, ordenacao, paginacao |
| `/produto/[slug]` | Detalhe: comparador, grafico, alertas, share |
| `/categoria/[slug]` | Produtos por categoria |
| `/marca/[slug]` | Produtos por marca |
| `/melhores/[slug]` | Guias curados |
| `/cupons` | Cupons ativos |
| `/trending` | Tendencias atuais |
| `/favoritos` | Favoritos do usuario |
| `/sobre` | Sobre o PromoSnap |
| `/admin/*` | Painel administrativo |

## Rotas API

| Rota | Metodo | Descricao |
|------|--------|-----------|
| `/api/cron` | GET | Cron endpoint (CRON_SECRET) |
| `/api/admin/jobs/run` | POST | Executar job (ADMIN_SECRET) |
| `/api/admin/jobs/status` | GET | Status dos jobs |
| `/api/admin/jobs/history` | GET | Historico de execucoes |
| `/api/alerts` | POST/GET/DELETE | Alertas de preco |
| `/api/favorites` | GET | Dados de favoritos por IDs |
| `/api/recently-viewed` | GET | Dados por slugs |
| `/api/clickout/[offerId]` | GET | Tracking + redirect |
| `/api/search/suggest` | GET | Autocomplete |

## Tabelas Prisma

Source, Merchant, Category, Brand, Product, ProductVariant, Listing, Offer, PriceSnapshot, Coupon, Clickout, SearchLog, EditorialBlock, JobRun, **PriceAlert**, **TrendingKeyword**

## Scripts

```bash
npm run dev          # Dev com Turbopack
npm run build        # Build producao
npm run db:generate  # Gerar Prisma client
npm run db:push      # Sync schema
npm run db:seed      # Seed via CLI
npm run db:studio    # Prisma Studio
```

## Limitacoes Atuais

- ML search API bloqueada (ingestao via trends + manual)
- OAuth token expira a cada 6h
- Rate limits na API publica
- Alertas preparados mas sem envio de email real (precisa integrar SendGrid/Resend)
- Imagens ML podem ter CORS

## Proximas Fases

- Envio real de email para alertas (SendGrid/Resend)
- Integracao Amazon, Shopee, Shein (adapters prontos)
- PWA completo com push notifications
- Testes automatizados (unit + e2e)
- Rate limiting nas APIs publicas
- CDN para imagens
- A/B testing para CTA e layout
