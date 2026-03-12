# PromoSnap

Comparador de precos brasileiro com automacao total, content engine, revenue OS, SEO machine, business OS, quality gates e governance engine. Monitora marketplaces, compara ofertas, mostra historico real de preco e opera com jobs automaticos.

**Dominio:** promosnap.com.br

## Stack

- **Framework:** Next.js 15 (App Router, Server Components, Turbopack)
- **UI:** Tailwind CSS 3 + design system customizado (light sportsbook theme)
- **DB:** PostgreSQL (Neon) via Prisma ORM
- **Cache:** Redis (ioredis) com TTL 5min para buscas
- **Charts:** Recharts
- **Icons:** Lucide React
- **Fonts:** Plus Jakarta Sans (display) + Inter (body)
- **Analytics:** GA4 (via NEXT_PUBLIC_GA_ID)
- **Email:** Resend (via RESEND_API_KEY)
- **Cron:** Vercel Cron (diario, 9am UTC)
- **PWA:** manifest.ts + BottomNav mobile

## Setup Local

```bash
git clone <repo>
cd promosnap
npm install

cp .env.example .env.local
# Edite DATABASE_URL, ML_CLIENT_ID, ML_CLIENT_SECRET, CRON_SECRET, etc.

npx prisma generate
npx prisma db push
npx prisma db seed

npm run dev
```

## Setup Vercel

1. Conecte o repo no Vercel
2. Variaveis de ambiente:
   - `DATABASE_URL` — Neon PostgreSQL
   - `APP_URL` — https://promosnap.com.br
   - `NEXT_PUBLIC_APP_URL` — https://promosnap.com.br
   - `ADMIN_SECRET` — segredo para rotas admin
   - `CRON_SECRET` — segredo para cron endpoint
   - `ML_CLIENT_ID` / `ML_CLIENT_SECRET` — ML OAuth
   - `ML_REDIRECT_URI` — callback OAuth
   - `RESEND_API_KEY` — email (opcional)
   - `NEXT_PUBLIC_GA_ID` — GA4 (opcional)
3. Build command: `prisma generate && next build`
4. Cron automatico via vercel.json (diario 9am)

## Setup Neon

1. Crie projeto em neon.tech
2. Copie connection string para DATABASE_URL
3. `npx prisma db push`
4. `npx prisma db seed`

## Setup Email (Resend)

1. Crie conta em resend.com
2. Configure dominio promosnap.com.br
3. Copie API key para RESEND_API_KEY
4. Templates: welcome, daily-deals, alert-triggered, campaign

## ML OAuth

1. Crie app em developers.mercadolivre.com.br
2. Configure ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI
3. Acesse /api/auth/ml para iniciar fluxo
4. Token salvo e renovado automaticamente

## Jobs e Automacao

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

## Business OS (V11)

Sistema de metricas e scorecards executivos:

- **North Star Metric:** clickouts qualificados/dia
- **Metricas:** aquisicao, engajamento, monetizacao, retencao, operacional
- **Scorecards:** Business, Product, Catalog, SEO, Revenue
- **Dashboard:** /admin/business com KPIs, trends 7d/30d, status visual
- **Helpers:** lib/business/metrics.ts, lib/business/scorecards.ts

## Quality Gates (V11)

Verificacoes automaticas de qualidade:

- Produtos sem imagem, sem brand/categoria
- Offers sem affiliateUrl
- Categorias vazias, marcas com catalogo fraco
- Artigos com conteudo insuficiente
- Dados incoerentes (preco original < atual)
- **Dashboard:** /admin/health
- **API:** /api/health (publico), /api/admin/health (detalhado)
- **Helpers:** lib/quality/gates.ts, lib/health/checks.ts

## Governance Engine (V11)

### Catalog Governance
- Classificacao: healthy, incomplete, stale, orphan, weak-canonical
- Recomendacoes acionaveis por problema
- Validacao de ingest (titulo, imagem, preco, URL)
- **Dashboard:** /admin/catalog-governance
- **Helpers:** lib/catalog/governance.ts, lib/catalog/validation.ts

### SEO Governance
- Auditoria: metadata, titles, canonicals, conteudo fraco, links internos
- Score SEO geral 0-100
- Coverage report (categorias, marcas, comparacoes, precos)
- Fila de acoes SEO priorizadas
- **Dashboard:** /admin/seo
- **Helpers:** lib/seo/governance.ts, lib/seo/coverage.ts

### Content Governance
- Classificacao de artigos: strong, weak, stale, thin
- Content score editorial (richness, linking, products, coverage)
- Recomendacoes: guias faltando, comparacoes, temas quentes
- **Dashboard:** /admin/content
- **Helpers:** lib/content/governance.ts, lib/content/score.ts

## Release Readiness (V11)

- Checklist de deploy: envs, DB, sources, sitemap, robots, rotas
- Smoke tests: home, busca, produto, clickout, sitemap
- Status: pronto/atencao/bloqueado
- **Dashboard:** /admin/release
- **Helpers:** lib/release/readiness.ts, lib/release/smoke.ts

## Audit System (V11)

- Runner consolidado: catalog + SEO + content + sources + quality + design
- Score global 0-100 com grade (A-F)
- Issues criticos, warnings, oportunidades
- **Dashboard:** /admin/audit com botao "Rodar Auditoria"
- **API:** POST /api/admin/audit/run
- **Helpers:** lib/audit/runner.ts, lib/audit/visual-score.ts

## Admin Security (V11)

- Todas as rotas /api/admin/* protegidas com ADMIN_SECRET
- Helper centralizado: lib/auth/admin.ts (validateAdmin)
- Suporte via header x-admin-secret ou query param ?secret=
- Cron protegido com CRON_SECRET

## Content Engine

- Model Article (Prisma) com markdown, categorias, tags
- Paginas /guias e /guias/[slug] com renderer markdown
- Sidebar com TOC, produtos relacionados, share buttons
- Admin /admin/artigos com CRUD completo
- API /api/admin/articles (GET/POST/PUT/DELETE)
- 8 artigos seed em pt-BR

## Revenue OS

- Smart CTA engine (lib/revenue/smart-cta.ts) com urgencia dinamica
- SmartCTA component com variantes visuais (high/medium/low)
- Dashboard /admin/monetizacao com revenue estimada por source/categoria
- API /api/admin/revenue com metricas consolidadas
- Taxas configuraveis por marketplace (Amazon 4%, ML 3%, Shopee 2.5%, Shein 3%)

## SEO Machine

- Sitemap dinamico com todas as paginas
- Paginas /melhores/[slug] (13 paginas curadas)
- Paginas /ofertas/[slug] (10 paginas de keyword)
- Paginas /comparar/[slug] (10 comparacoes)
- Hubs /categorias e /marcas
- FAQ schema, breadcrumb schema, product schema
- Content generators (FAQ, meta, intro)
- InternalLinks component

## Admin

/admin com painel completo e sidebar agrupada:

**Overview:** Dashboard, Business OS
**Catalogo:** Produtos, Ofertas, Fontes, Prioridades, Governance
**Conteudo:** Conteudo, Artigos, Tendencias
**Growth:** SEO, SEO Gaps, Analise, Desempenho, Indicacoes
**Monetizacao:** Revenue dashboard
**Engajamento:** Email, Alertas, Inteligencia, Decisoes, Email Intel
**Operacao:** Jobs, Ingestao, Health, Release, Auditoria, Config

## Paginas

| Rota | Descricao |
|------|-----------|
| `/` | Homepage: hero, trends, oferta do dia, rails, categorias, newsletter |
| `/ofertas` | Grid de ofertas quentes |
| `/ofertas/[slug]` | Paginas SEO por keyword |
| `/menor-preco` | Maior desconto historico |
| `/mais-vendidos` | Produtos mais populares |
| `/busca?q=...` | Busca com filtros, voz, ordenacao |
| `/produto/[slug]` | Detalhe: comparador, grafico, alertas, savings |
| `/preco/[slug]` | Historico de preco com chart, stats, recomendacao |
| `/categoria/[slug]` | Produtos por categoria |
| `/categorias` | Hub de categorias |
| `/marca/[slug]` | Produtos por marca |
| `/marcas` | Hub de marcas |
| `/melhores/[slug]` | Guias curados (13 paginas) |
| `/comparar/[slug]` | Comparacoes (10 paginas) |
| `/guias` | Listagem de artigos |
| `/guias/[slug]` | Artigo completo |
| `/cupons` | Cupons ativos |
| `/trending` | Tendencias atuais |
| `/favoritos` | Favoritos do usuario |
| `/minha-conta` | Conta sem login (localStorage) |
| `/indicar` | Sistema de indicacao |
| `/sobre` | Sobre o PromoSnap |
| `/transparencia` | Transparencia e como ganhamos dinheiro |
| `/politica-privacidade` | Politica de privacidade |
| `/termos` | Termos de uso |
| `/admin/*` | Painel administrativo |

## Tabelas Prisma

Source, Merchant, Category, Brand, Product, ProductVariant, Listing, Offer, PriceSnapshot, Coupon, Clickout, SearchLog, EditorialBlock, JobRun, PriceAlert, TrendingKeyword, Article, Referral, Subscriber, EmailLog

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

- Adapters ML/Amazon/Shopee/Shein em modo MOCK
- OAuth token ML expira a cada 6h
- Envio de email depende de RESEND_API_KEY configurado
- PWA icons placeholder
- Imagens ML podem ter CORS
- Vercel Hobby: cron limitado a 1x/dia
- Testes automatizados (unit + e2e) pendentes
- Rate limiting nas APIs publicas pendente
- Monitoring (Sentry) nao conectado

## Proximos Passos (V12)

- Adapters reais para Amazon PA-API, Shopee, Shein
- Push notifications via PWA
- Testes automatizados (unit + e2e)
- Rate limiting nas APIs publicas
- CDN para imagens
- A/B testing com tracking real
- Export CSV no admin
- Dashboard de cohort avancado
- Monitoring (Sentry)
- Integrar YouMayLike e PersonalizedRails nas paginas
