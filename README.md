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

## UX Merchandising & Fusion (V16-V17)

### Visual Depth & Merchandising
- FeaturedSpotlight com 3 variants (deal-of-day, editors-pick, trending)
- IntentShowcase com 5 tabs de intencao (custo-beneficio, entrega rapida, mais avaliados, em queda, vale agora)
- Carousel melhorado: animacoes direcionais, installments, progress bar
- CSS merchandising: card-deep, card-border-gradient, section-separator, merchandising slots
- Microinteracoes: hover-card, press-feedback, sidebar-glow, quick-action-hover

### Navigation & Trust UX
- Sidebar reorganizada em 4 grupos com badges dinamicos
- ContextualNav no produto: links rapidos para secoes da pagina
- OfferCard trust badges (Verificado quando score >= 70)
- DecisionSummary: "Vale a pena comprar?" com confianca e melhor escolha
- WhyHighlighted: transparencia de ranking com barras de progresso
- PriceComparison mobile melhorado com "Melhor Escolha" badge

### Personal Feed & Community
- Feed pessoal na minha-conta com timeline de atividades
- Indicar melhorado: hero premium, canais de comunidade, motivacao
- Homepage reordenada com WhatChanged ticker
- Paginas de canais com generateStaticParams

### Admin Growth & Ops
- Growth & Ops dashboard com trend-catalog gaps
- Command Center com "Acoes do Dia"
- Imports com quick stats
- Distribution com "Proxima Melhor Oferta"

## Real Catalog Sourcing & Commerce Automation (V18)

### Canonical Product Graph
- Produto canonico com N listings/ofertas/fontes associadas
- Canonical matching engine (lib/catalog/canonical-match.ts): heuristica multi-fator (tokens, brand, model, category, storage)
- Confidence levels: strong (>0.85), probable (0.6-0.85), weak (<0.6)
- Canonical graph layer (lib/catalog/canonical-graph.ts): view consolidada, merge seguro, variant tree, stats
- Product attributes extraction: brand, model, storage, color, screenSize, capacity, gender
- API admin: recalculate matches, merge products, extract attributes

### Normalization Engine
- 65+ marcas no BRAND_ALIASES (expandido de 30)
- 18 categorias no CATEGORY_KEYWORDS (expandido de 9)
- COLOR_MAP com 50+ cores (EN→BR, brand-specific)
- Funcoes: extractStorage, extractColor, extractScreenSize, extractCapacity, extractGender
- extractAllAttributes para extracao em passo unico
- normalizeForMatch: normalizacao pesada para matching (lowercase, sem acentos, tokens ordenados)
- tokenSimilarity: similaridade Jaccard para comparacao de titulos

### Real Sourcing Strategy
- 6 modos de sourcing: curated-manual, import-csv-json, affiliate-feed, trends-assisted, candidate-expansion, source-adapter
- Feed ingestion robusto: CSV, JSON, URL list, title/ID list com validacao por item
- Admin /admin/sourcing: dashboard completo com pipelines, lotes, candidatos, acoes em lote
- API /api/admin/sourcing: import, process, recalculate, publish

### Smart Filters & Comparison
- Filtros por atributos reais: storage, cor, tela, marca, faixa de preco, frete gratis, rating
- AttributeFilters component responsivo (sidebar desktop, barra mobile)
- Smart comparison canonica: melhor preco, trust, entrega, avaliacao, custo-beneficio
- ProductVersions: variantes como pills (128GB/256GB, cores, tamanhos)

### Commerce Automation
- Rules engine com 5 regras default: highlight-hot-deal, carousel-worthy, deal-of-day, distribution-ready, needs-article
- Auto merchandising: hero slot, carousel, deal of day, promo strip, banners automaticos
- Respeita overrides manuais (manual Banner com prioridade maior nao e sobrescrito)
- Admin /admin/automation: toggle regras, ajustar thresholds, simulacao, aplicacao

### Catalog Quality at Scale
- Quality score 0-100 por produto (weighted: titulo, imagem, preco, categoria, brand, rating)
- 6 tipos de issue: matches fracos, sem atributos, duplicatas provaveis, sem imagem, URL fraca, source inconsistente
- Deteccao de duplicatas por similaridade Jaccard
- Admin /admin/catalog-quality com distribuicao de scores e secoes expandiveis

### Product Experience V3
- CanonicalView: visao consolidada com todas as fontes agrupadas
- VariantSelector: pills de variantes com precos e swatches de cor
- MiniCluster: badges "3 lojas", "2 versoes", "4 ofertas"
- ProductGrouping: agrupamento inteligente para categoria/busca
- Produto page com visao canonica e variantes

### Admin Intelligence
- Catalog gaps: categorias com demanda mas pouca cobertura, marcas fortes, single-source risk
- Recommended imports: sugestoes baseadas em trends, buscas, favoritos, artigos, gaps
- Sourcing-SEO bridge: sugestoes de destaque, distribuicao, artigos, paginas SEO
- Admin /admin/catalog-intelligence com metricas e acoes priorizadas

## Full Review & Maturity Fusion (V18-V19)

### Deep Project Review
- Auditoria completa: app site, admin, API routes, lib helpers, schema, components
- Fix: metadataBase usando getBaseUrl() em vez de env raw
- Fix: import duplicado em lib/seo/metadata.ts
- Fix: nav item duplicado no admin layout
- Fix: TypeScript error em indicar/page.tsx (as const narrowing)
- Verificacao: todas as 23 rotas admin protegidas com validateAdmin
- Dead code identificado: PersonalizedRails.tsx, YouMayLike.tsx (mantidos para uso futuro)

### Project Integrity Module
- lib/project/integrity.ts: getIntegrityReport() com score 0-100
- Checks: dominio, modulos criticos (24), rotas admin (23), schema (23 models), metadata, env vars
- Score ponderado por categoria

### Canonical Graph Strengthened
- EAN/GTIN matching (0.98 confidence imediata)
- Model extraction preciso (Galaxy S24 vs S24 Ultra, variantes separadas)
- Penalidade por category mismatch
- Deteccao acessorio vs produto principal
- batchCanonicalMatch para processamento em lote
- getCanonicalFamily: produto + variantes + similares com tipo de relacao
- splitCanonical: reverso do merge (separar listings em novo produto)
- Stats melhorados: coverage %, avg confidence, strong/probable/weak counts

### Normalization Expanded
- RAM extraction: "8GB RAM", "8GB/128GB", "8GB LPDDR5"
- Processor extraction: Snapdragon Gen, Google Tensor, Apple A-series, Intel Core Ultra, AMD Ryzen PRO
- Connectivity: 5G/4G, Wi-Fi 6/6E/7, Bluetooth, NFC, USB-C, eSIM
- Battery extraction: mAh e Wh
- Frequency voting com peso duplo para product name

### Sourcing Pipeline Matured
- CSV parsing RFC 4180 (quoted fields, auto-detect delimiter)
- URL list: validacao de formato, domain extraction
- Error reporting por item (line, field, reason, rawValue)
- Dry run mode (validar sem persistir)
- Publish pipeline transacional: publishBatch, enrichBatch, rejectBatch, getPublishPreview
- Pipeline health indicators (green/yellow/red)
- Last run timestamps
- Search/filter em candidates

### Trust & Decision UX Evolved
- DecisionSummary: "Momento de compra" (Bom/Neutro/Espere), trend arrow, economia estimada
- PriceComparison: delivery time, mobile cards melhorados, Verificado mais prominente
- BuyingGuide: "Guia Rapido" com specs, pros e consideracoes (colapsavel mobile)

### Community & Retention Strengthened
- Favoritos: sort options, alerta ativo badge, criar alerta inline, empty state melhorado
- PersonalizedNews: razao da recomendacao, limite 6 items, "Ver mais"
- SinceLastVisit: timeline layout, price arrows, "Novos guias"
- Canais: hero melhorado, subscriber estimates, "Por que participar?"
- Indicar: gamificacao com 4 niveis, atividade recente, copy feedback individual
- Distribution: distributeToSegment, history por canal, personalizacao por segmento

### Commerce Automation Expanded
- 8 regras (3 novas): content-opportunity, single-source-risk, trending-uncovered
- getRuleResults por regra individual
- ActionSuggestion com prioridade por match
- autoSuggestContent e autoSuggestImports
- Logging estruturado de auto-fill (slot, reason, score)
- Automation bridge: bridgeCanonicalToActions, getAutomationSuggestions unificado

### Growth & Revenue Intelligence
- Revenue by category/source com trends
- Top revenue products, underperformers
- Revenue opportunities por categoria/marca
- Commercial ranking unificado com score 0-100
- Growth Ops melhorado: revenue opportunities, acoes sugeridas, trend indicators, quick actions

### UI/UX Polish
- Cards: multi-layer shadows, indigo-tinted hover borders
- Buttons: btn-danger, btn-success, blue glow no primary
- Stat cards: gradient bg, hover lift, radial glow accent
- Admin tables: gradient header, hover rows
- Status badges: ok/warning/critical/neutral com gradients
- Toast: gradient bg, progress bar auto-dismiss, backdrop blur
- EmptyState: glow decorativo, gradient icon bg
- LoadingState: dots animation com stagger
- OfferCard: badge spacing, MEGA OFERTA gradient
- Footer: glow shadow, gradient divider
- RailSection: gradient icon container, hover bg no "Ver tudo"
- Homepage: section separators, section headers com icons, branding "Central de Inteligencia"
- ProductGrouping: store/offer pills, best price, smooth expand/collapse
- OfferCarousel: "Oferta verificada" badge, economia display, transition debounce

## Opportunity Engine & Executive Cockpit (V20)

### Opportunity Engine
- lib/opportunity/engine.ts: motor central de oportunidades priorizadas
- 10 tipos: catalog-weak, high-potential, category-gap, low-monetization, low-trust, highlight-candidate, content-missing, distribution-recommended, campaign-recommended, needs-review
- Scoring real via Prisma: clickouts, CTR, views, revenue, trust, decision value, gaps, trends, alertas, favoritos
- calculateImpact, calculateEffort, calculateConfidence (0-100 cada)
- getOpportunities, getTopOpportunities, summarizeOpportunities

### Executive Cockpit
- /admin/cockpit: centro de comando executivo
- "Hoje no PromoSnap": 5-10 acoes prioritarias do dia com impact/confidence bars
- "Destaques da Semana": clickouts delta, novos produtos, listings, subscribers, top categorias
- "Riscos e Alertas": low trust, stale offers, failed jobs, weak matches
- API /api/admin/cockpit com dados reais

### Assisted Operations
- lib/operations/assisted-actions.ts: quick actions por contexto (catalog, growth, distribution, merchandising)
- lib/operations/context-lists.ts: 12 listas operaveis (needs-review, weak-match, missing-image, high-potential, uncovered-trends, ready-to-distribute, carousel-candidates, etc.)
- Acoes com prioridade, URL, e flag canAutoExecute

### Smart Merchandising
- lib/merchandising/candidates.ts: candidatos rankeados por slot (hero, carousel, banner, deal-of-day, promo-strip)
- Score composto: decision value, trust, desconto, clickout heat
- Razoes por candidato: "Alto desconto", "Trust elevado", "Entrega rapida", "Community heat"
- /admin/merchandising: slots, candidatos, scores, acoes

### Growth Ops + Revenue Compounding
- Money Map: interest vs revenue vs gap por categoria/marca/fonte
- Revenue Compounding: produtos recorrentes, categorias com recorrencia, conteudo que converte, canais com retorno
- lib/business/money-map.ts: getMoneyMap, getCompoundingRevenue
- Growth Ops melhorado: money map tables, revenue compounding, recommended next actions

### Catalog Governance at Scale
- lib/catalog/governance-score.ts: score 0-100 com 7 dimensoes (image, brand, category, match, trust, attributes, delivery)
- Breakdown com progress bars por dimensao
- Trend: comparacao vs 7 dias atras
- Recomendacoes baseadas nas dimensoes mais fracas
- lib/catalog/expansion-recommendations.ts: next imports, categorias para fortalecer, marcas para adicionar, agrupamentos para criar

### Project Integrity Expanded
- Checks de opportunity engine (6 modulos), automation (6 modulos), sourcing pipeline (6+4 adapters)
- getIntegritySummary: status + score + critical/warning counts
- 28 admin API routes verificadas com validateAdmin

### Front-end Evolution
- DailyOpportunities: "Oportunidades do Dia" na homepage com price drops e decision value
- OfferCard: "N lojas" pill, delivery estimate, "Popular" heat indicator
- Sidebar: notification dots em items com acoes pendentes, link Cockpit
- RailSection: liveBadge "Ao vivo" com pulse dot
- CSS: pulse-dot, card-live, opportunity-card, section-live-indicator, btn-offer melhorado
- EmptyState: action prop para CTA estruturado

## Real Integrations & Execution Layer (V21)

### Execution Layer
- lib/execution/engine.ts: motor de execucao central com 9 tipos de acao
- Tipos: create_banner, feature_product, publish_distribution, trigger_job, create_review_task, create_import_batch, trigger_email, trigger_webhook, create_campaign
- Execucao real via Prisma: cria banners, destaca produtos, dispara distribuicao, cria tasks
- In-memory store (FIFO 1000 entries) com status, payload, resultado, retries
- /admin/executions: dashboard de execucoes com filtros, detalhes expandiveis
- /api/admin/executions: GET (listar) + POST (executar/retry)

### Closed-Loop Operations
- Cockpit com "Executar" button em cada oportunidade
- Execucoes recentes no cockpit com status inline
- Closed-loop view: oportunidade → acao → resultado mensuravel
- getExecutionEffectiveness: success rate, measurable outcome rate

### Real Integrations
- lib/integrations/webhooks.ts: webhook generico com timeout, retry, Slack/Discord style
- lib/integrations/slack.ts: notificacoes via SLACK_WEBHOOK_URL, Block Kit formatting
- lib/integrations/discord.ts: notificacoes via DISCORD_WEBHOOK_URL, embed formatting
- Telegram melhorado: configValidation, sendTestMessage, execution log
- WhatsApp melhorado: provider-agnostic interface, API readiness, preview fallback
- lib/integrations/email-execution.ts: tracking de envios, stats por tipo

### Source Readiness
- lib/adapters/readiness.ts: status por source (ready/partial/mock/blocked/not_configured)
- Capability map: search, lookup, feed_sync, clickout_ready, price_refresh, import_ready
- Checklist por source com status ok/missing/partial
- Todos os adapters com healthCheck, readinessCheck, capabilityMap
- Admin /admin/fontes com readiness badges, capability pills, checklist expandivel

### Feed Sync Architecture
- lib/sourcing/feed-sync.ts: estrutura para importacao recorrente por feed
- FeedSyncConfig: source, format, URL, schedule, status
- runFeedSync placeholder com validacao e logging
- Pronto para conectar providers reais

### Security Hardening
- 17 API routes corrigidas: removido vazamento de error.message/String(err)
- lib/env/validate.ts: validacao de envs obrigatorias e opcionais
- Error handling melhorado em search, newsletter, price-history
- 15 arquivos com imports nao utilizados limpos

### Measurement
- lib/measurement/tracking.ts: tracking de execucoes e clickout conversion
- Conversion funnel: impressions → clicks → clickouts → revenue por categoria/source
- Measurement gaps identificados: 7 areas com tracking incompleto

### Pending Audit
- lib/project/pending-audit.ts: classificacao em 3 grupos (critico/importante/futuro)
- 8 pendencias criticas, 7 importantes, 7 futuras — todas documentadas
- 9 bottlenecks do sistema identificados com severidade e recomendacao
- Admin dashboard com "Pendencias Criticas" e score de integridade

### Admin Usability
- lib/admin/usability.ts: health summary e quick access items
- Admin dashboard com pendencias criticas, sistema status, quick access
- Stat cards consistentes com CSS stat-card

### Future Readiness
- lib/readiness/future-prep.ts: readiness para auth, push, CDN, E2E, RBAC
- lib/readiness/smoke-surface.ts: 7 caminhos criticos para smoke test
- runQuickSmoke: verificacao automatica de saude das rotas

### CSS System Expanded
- Execution status classes (success/failed/pending/running)
- Readiness badges (ready/partial/mock/blocked)
- Checklist item styling
- Integration card com status indicator

## Limitacoes Atuais

- Adapters ML/Amazon/Shopee/Shein em modo STUB (interface pronta, dados mock)
- OAuth token ML expira a cada 6h
- Envio de email depende de RESEND_API_KEY configurado
- Telegram depende de TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
- WhatsApp em modo manual (preview copiavel)
- PWA icons placeholder
- Imagens ML podem ter CORS
- Vercel Hobby: cron limitado a 1x/dia

## Proximos Passos (V22)

- Adapters reais para Amazon PA-API, Shopee, Shein (conectar providers)
- Feed sync real com scheduled imports
- Push notifications via PWA
- Testes e2e com Playwright (smoke surface pronta)
- CDN real para imagens (abstracacao pronta)
- User accounts (auth real, login/signup)
- WhatsApp Business API real (provider interface pronta)
- Telegram bot commands interativos
- Canonical match ML-assisted (embedding similarity)
- Price prediction (historico + tendencia)
- A/B testing com tracking real
- Export CSV no admin
- Multi-currency support
- Admin role-based access control (RBAC readiness pronta)
- Gamificacao e badges de usuario
