# PromoSnap

Comparador de precos brasileiro com automacao total, content engine, revenue OS, SEO machine, business OS, quality gates e governance engine. Monitora marketplaces, compara ofertas, mostra historico real de preco e opera com jobs automaticos.

**Dominio Canonico:** www.promosnap.com.br

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
   - `APP_URL` — https://www.promosnap.com.br
   - `NEXT_PUBLIC_APP_URL` — https://www.promosnap.com.br
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
**Catalogo:** Produtos, Ofertas, Fontes, Prioridades, Governance, Data Trust, Editor, Importacao
**Conteudo:** Conteudo, Artigos, Tendencias
**Growth:** SEO, SEO Gaps, Analise, Desempenho, Indicacoes
**Monetizacao:** Revenue dashboard
**Engajamento:** Email, Alertas, Inteligencia, Decisoes, Email Intel, Distribuicao
**Conteudo:** Conteudo, Artigos, Tendencias, Banners
**Operacao:** Jobs, Ingestao, Health, Release, Auditoria, Runtime QA, Monitoring, Rate Limits, Production, Config

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
npm test             # Testes unitarios (136 testes)
npm run test:smoke   # Smoke tests (rotas, API, sitemap)
npm run verify       # Testes + smoke + build completo
npm run verify:quick # Testes + smoke (sem build)
```

## Production Hardening (V12)

### Canonical Domain
- Dominio canonico: https://www.promosnap.com.br
- Helper central: lib/seo/url.ts (getBaseUrl, absoluteUrl, canonicalUrl)
- Todas as refs de URL unificadas (sitemap, robots, metadata, share, email)

### Runtime QA
- 16 checks automaticos (routes, API, security, data)
- Dashboard: /admin/runtime
- API: GET /api/admin/runtime-check

### Data Trust Layer
- Trust score 0-100 por produto (imagem, brand, categoria, preco, affiliate, source, historico)
- Validadores de oferta/listing/produto
- Dashboard: /admin/data-trust
- Helpers: lib/data-trust/

### Cache System
- Cache hibrido Redis + in-memory fallback
- TTLs predefinidos: busca (5min), trending (10min), scorecards (15min)
- Helper: lib/cache/index.ts

### Query Optimization
- Queries com select targetado (sem includes excessivos)
- 7 novos indexes compostos no schema
- Eliminacao de N+1 em admin sources

### Security
- Todas as rotas /api/admin/* protegidas com validateAdmin
- Config page sem exposicao de secrets
- APIs publicas com payloads minimizados

## Production Readiness (V13)

### Rate Limiting
- Sliding-window in-memory rate limiter (lib/security/rate-limit.ts)
- Limites: public API 60/min, search 30/min, clickout 120/min
- Aplicado em: /api/search, /api/clickout, /api/alerts, /api/newsletter, /api/trending
- Admin dashboard: /admin/rate-limits
- API: GET /api/admin/rate-limits

### Monitoring & Observability
- Error/event capture in-memory buffer (lib/monitoring/)
- Sentry opcional (dynamic import, nao quebra sem @sentry/nextjs)
- captureError integrado em cron e jobs
- Dashboard: /admin/monitoring
- API: GET /api/admin/monitoring

### Tests & Safety Net
- Test runner custom (lib/__tests__/test-utils.ts)
- Testes: rate-limit, data-trust, url, cache
- Smoke test script: scripts/smoke-test.ts
- Scripts: npm test, npm run test:smoke
- DB push helper: scripts/db-push.sh

### Images & CDN Strategy
- SafeImage component (fallback, skeleton, error handling)
- Image utilities: getImageUrl, getFallbackImage, isValidImageUrl
- CDN abstraction via IMAGE_CDN_URL env
- Image audit: lib/images/audit.ts
- Helpers: lib/images/

### Source Integration Readiness
- Adapter interface unificada (lib/adapters/types.ts)
- Registry centralizado (lib/adapters/registry.ts)
- Stubs preparados: Amazon PA-API, Mercado Livre, Shopee, Shein
- Cada adapter com isConfigured() e getStatus()
- Admin /admin/fontes com status de configuracao

### Production Validation
- Production readiness checks (envs, DB, data, security, SEO)
- Score 0-100 com status por check
- Dashboard: /admin/production
- API: GET /api/admin/production

### UX Components
- EmptyState, ErrorState, LoadingState components reutilizaveis
- Toast notification system (provider + useToast hook)
- Animacoes CSS para toasts
- Aplicado em busca e favoritos

## Safe Consolidation (V14)

### Code Consolidation
- ImageWithFallback consolidado como wrapper de SafeImage
- Dead code removido (lib/mock-data.ts)
- Nomenclatura e doc comments padronizados nos subsistemas health/quality/production/runtime

### Testing Expansion
- 136 testes unitarios (92 novos): rate-limit, production, monitoring, images, catalog-validation
- Smoke tests expandidos: sitemap.xml, robots.txt, health API
- Script verify: npm run verify (tests + smoke + build)

### UX Refinement
- ErrorState com variants (generic, network, server, permission), modo compact
- LoadingState com dots variant, sizes (sm/md/lg)
- EmptyState com children prop, iconBg por variant, sugestoes
- Toast com borders coloridos, animacoes spring, melhor dismiss
- Newsletter com validacao de email e feedback visual

### Design Polish
- OfferCard: image-container branco, btn-offer CTA, badges com shadow
- RailSection: icone em container, animacao chevron no hover
- Footer: blur orb decorativo, hover shadow no logo, hierarquia de cores
- Visual depth: btn active:scale, surface-elevated com 3 sombras, section-contrast
- PriceChart lazy-loaded via client wrapper (PriceChartLazy)

### Admin Quality of Life
- Severity helper canonico (lib/admin/severity.ts): ok/info/warning/critical
- 8 dashboards admin refinados com guidance operacional
- Mensagens claras para: missing config, source error, provider missing, cron missing
- Rate limits com indicador de utilizacao colorido
- Monitoring com health badge, progress bars, stat cards

### Observability
- Logging estruturado: logDebug, logInfo, logWarn (lib/monitoring/)
- captureError integrado em clickout, alerts, cron, jobs
- Logs de timing por job no cron
- Reducao de ruido em producao

### Security & API
- 3 rotas admin desprotegidas corrigidas (ingest, seed, trends)
- 7 respostas HTTP padronizadas ({ error: "msg" } + status codes consistentes)
- Newsletter nao vaza mais error.message
- Audit run nao expoe mais details internas

### Performance
- PriceChart com next/dynamic ssr:false via client wrapper
- Query redundante removida em getAdminSources
- recharts lazy-loaded nas paginas de preco e produto

## Commerce Brain & Distribution (V15)

### Product Vision
- Homepage hero reescrito com proposta de valor clara
- Secao "Por que usar o PromoSnap?" com 6 cards de diferenciais
- Pagina /sobre reescrita como central de inteligencia de compra

### Bet-Inspired UX
- Sidebar desktop sportsbook-inspired (64px compacta, 208px expandida)
- Carousel inteligente de ofertas na homepage (auto-rotate 5s)
- PromoBanner strip dismissivel com variants (info/promo/alert)
- PromoModal session-once com delay e backdrop blur

### Admin Command Center
- Dashboard principal como cockpit: status, catalogo, banners, candidates, quick actions
- Backoffice de banners com CRUD completo (HERO/MODAL/STRIP/CAROUSEL)
- Auto-rules para banners: top-offers, top-discount, campaign
- Catalog editor com edicao inline, flags (featured/hidden/needsReview), bulk actions
- Painel de distribuicao multicanal

### Schema (novos modelos)
- Banner (title, subtitle, image, CTA, type, priority, autoMode, startAt/endAt)
- ImportBatch (fileName, format, status, totals, errors)
- CatalogCandidate (title, brand, category, price, status, enrichedData)
- Product: +featured, +hidden, +needsReview, +editorialScore

### Ingestion Strategy
- Strategy layer (lib/ingest/strategy.ts): curated, seed, trends, adapter, import
- Import pipeline CSV/JSON com validacao e enrichment automatico
- CatalogCandidate: candidatos revisaveis antes de virar produto
- Enrichment heuristico: brand detection (60+ marcas), category inference (15 categorias)
- Admin /admin/imports com upload, status de lotes, processamento

### Consolidated Reviews
- Avaliacao consolidada por produto (lib/reviews/consolidated.ts)
- Rating ponderado por source trust e volume de reviews
- ConsolidatedRating component na pagina de produto
- CategoryInsights: top avaliado, melhor custo-beneficio, mais popular

### Shipping Intelligence
- Sinais de entrega: frete gratis, entrega rapida, envio full
- ShippingScore 0-100 com breakdown
- ShippingBadge component em produto e OfferCard
- Classificacao honesta (unknown quando dado nao existe)

### Distribution Engine
- Canais: homepage, email, telegram, whatsapp
- Templates pt-BR por canal com emoji e copy profissional
- Telegram: envio real via Bot API (quando configurado)
- WhatsApp: preview copiavel para envio manual
- Admin /admin/distribution com status, ofertas prontas, previews, envio

### Decision Value Score
- Score 0-100 combinando: preco, avaliacao, trust, shipping, revenue
- Highlights engine para selecao inteligente de destaques
- Usado em carousel, banners, distribuicao

## Retention Loops & Community (V16)

### Retention Loops
- Favoritos evoluidos para Watchlist real com price tracking
- "Desde sua ultima visita" — quedas de preco e novos produtos
- "Novidades para voce" — baseado em favoritos, buscas e categorias
- Alertas com progress bar (preco atual vs alvo), quick-select targets
- API /api/updates para atualizacoes personalizadas

### Personalization V3
- Rails personalizados: "Para voce", "Quedas recentes", "Baseado nos favoritos"
- Recomendacoes por price drops, categoria, marca
- Renderiza apenas com sinal suficiente (min 3 favoritos ou 5 views)

### Community Engine
- Hub /canais com canais (Telegram, WhatsApp, Email) e categorias
- Landing pages /canais/[slug] para 6 segmentos (eletronicos, cupons, ofertas-quentes, moda, casa, games)
- Distribution segments (geral + 6 categorias) no admin
- Social ranking: mais clicados, mais monitorados, mais populares

### Catalog Flywheel
- Pipeline de candidates com sub-status (PENDING → ENRICHED → NEEDS_REVIEW → APPROVED → PUBLISHED)
- Catalog Opportunities: categorias/marcas/keywords com gap de cobertura
- Batch enrichment melhorado: brand aliases, 18 categorias, shipping signals
- Batch publish: aprovar/rejeitar/publicar candidates em lote
- Admin /admin/catalog-opportunities

### Retention Monetization
- Metricas de retencao: returning users, alert-to-clickout, recurring clickouts
- Retention value ranking: quais features trazem retorno
- Secao "Retencao" no admin/business

### UX Components
- WatchlistCard, AlertCard, CommunityCard reutilizaveis
- SocialProof component na homepage
- Live indicators (pulse dots, "Atualizado agora")
- Canais link na sidebar desktop

## Limitacoes Atuais

- Adapters ML/Amazon/Shopee/Shein em modo STUB (interface pronta, dados mock)
- OAuth token ML expira a cada 6h
- Envio de email depende de RESEND_API_KEY configurado
- Telegram depende de TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
- WhatsApp em modo manual (preview copiavel)
- PWA icons placeholder
- Imagens ML podem ter CORS
- Vercel Hobby: cron limitado a 1x/dia

## Proximos Passos (V17)

- Adapters reais para Amazon PA-API, Shopee, Shein
- Push notifications via PWA
- Testes e2e com Playwright
- CDN real para imagens (Cloudflare/Imgix)
- A/B testing com tracking real
- Export CSV no admin
- WhatsApp Business API real
- Telegram bot commands interativos
- User accounts (auth real, login/signup)
- Gamificacao e badges de usuario
